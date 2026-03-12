import re
import pdfplumber
from typing import Optional, Tuple
from io import BytesIO

class ResumeParser:
    """Parse resume PDFs to extract candidate information"""
    
    # Email regex pattern
    EMAIL_PATTERN = re.compile(
        r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
        re.IGNORECASE
    )
    
    # Phone patterns for various formats
    PHONE_PATTERNS = [
        re.compile(r'\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}'),
        re.compile(r'\(\d{3}\)\s*\d{3}[-.\s]?\d{4}'),
        re.compile(r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}'),
    ]
    
    # Common address indicators
    ADDRESS_INDICATORS = ['street', 'st.', 'avenue', 'ave.', 'road', 'rd.', 
                          'drive', 'dr.', 'lane', 'ln.', 'boulevard', 'blvd.',
                          'apt', 'suite', 'floor', 'unit', '#']
    
    @staticmethod
    def extract_text_from_pdf(file_content: bytes) -> str:
        """Extract all text from PDF file"""
        text = ""
        try:
            with pdfplumber.open(BytesIO(file_content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            raise ValueError(f"Failed to parse PDF: {str(e)}")
        return text
    
    @staticmethod
    def extract_email(text: str) -> Optional[str]:
        """Extract first email address from text"""
        match = ResumeParser.EMAIL_PATTERN.search(text)
        return match.group(0).lower() if match else None
    
    @staticmethod
    def extract_phone(text: str) -> Optional[str]:
        """Extract phone number from text"""
        for pattern in ResumeParser.PHONE_PATTERNS:
            match = pattern.search(text)
            if match:
                return match.group(0)
        return None
    
    @staticmethod
    def extract_name(text: str, email: Optional[str] = None) -> Optional[str]:
        """
        Extract candidate name from resume.
        Uses multiple strategies:
        1. First non-empty line (common resume format)
        2. Text before email on same line
        3. Name pattern matching
        """
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        if not lines:
            return None
        
        # Strategy 1: First line is often the name
        first_line = lines[0]
        
        # Skip if first line looks like a header/title
        skip_words = ['resume', 'cv', 'curriculum', 'vitae', 'profile', 'objective']
        if any(word in first_line.lower() for word in skip_words):
            if len(lines) > 1:
                first_line = lines[1]
        
        # Clean up the name (remove special characters, numbers at start)
        name = re.sub(r'^[\d\W]+', '', first_line)
        name = re.sub(r'[|•·].*$', '', name)  # Remove anything after separators
        name = name.strip()
        
        # Validate: name should be 2-50 chars, contain letters
        if name and 2 <= len(name) <= 50 and re.search(r'[a-zA-Z]', name):
            # Check if it looks like a name (not an email, phone, or address)
            if not ResumeParser.EMAIL_PATTERN.search(name):
                if not any(indicator in name.lower() for indicator in ResumeParser.ADDRESS_INDICATORS):
                    return name
        
        return None
    
    @staticmethod
    def extract_address(text: str) -> Optional[str]:
        """Extract address from resume text"""
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check for address indicators
            line_lower = line.lower()
            if any(indicator in line_lower for indicator in ResumeParser.ADDRESS_INDICATORS):
                # Clean up the address
                address = re.sub(r'[|•·]', '', line).strip()
                if len(address) > 10:  # Reasonable address length
                    return address[:255]  # Limit length
        
        # Look for patterns like "City, State ZIP"
        zip_pattern = re.compile(r'[A-Za-z]+,?\s+[A-Z]{2}\s+\d{5}(-\d{4})?')
        for line in lines:
            if zip_pattern.search(line):
                return line.strip()[:255]
        
        return None
    
    @classmethod
    def parse(cls, file_content: bytes) -> dict:
        """
        Parse a PDF resume and extract key information.
        
        Returns:
            dict with keys: email, name, phone, address, raw_text
        """
        text = cls.extract_text_from_pdf(file_content)
        
        if not text.strip():
            raise ValueError("PDF appears to be empty or could not be read")
        
        email = cls.extract_email(text)
        name = cls.extract_name(text, email)
        phone = cls.extract_phone(text)
        address = cls.extract_address(text)
        
        return {
            'email': email,
            'name': name,
            'phone': phone,
            'address': address,
            'raw_text': text[:5000]  # Store first 5000 chars for reference
        }

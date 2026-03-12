"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    ChevronLeft,
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Clock,
    FileText,
    Download,
    Eye,
    QrCode,
    ExternalLink,
    RotateCw,
    Pencil,
    Trash2,
    UserCheck,
    UserX,
    Loader2,
    Copy,
    Briefcase,
    Target,
    GraduationCap,
    Camera
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
    fetchCandidateById,
    updateUser,
    deleteUser,
    regenerateCandidateQR,
    resetCandidateLogin,
    uploadUserProfilePhoto,
    User as UserType
} from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function CandidateProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const candidateId = parseInt(params.candidateId as string);

    const [candidate, setCandidate] = useState<UserType | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    useEffect(() => {
        async function loadCandidate() {
            try {
                const data = await fetchCandidateById(candidateId);
                setCandidate(data);
            } catch (error) {
                console.error('Error fetching candidate:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load candidate profile.',
                    variant: 'destructive',
                });
                router.push('/candidates');
            } finally {
                setLoading(false);
            }
        }
        loadCandidate();
    }, [candidateId, router, toast]);

    const handleStatusToggle = async () => {
        if (!candidate) return;
        setActionLoading(true);
        const newStatus = candidate.status === 'active' ? 'inactive' : 'active';
        try {
            await updateUser(candidate.id, { status: newStatus });
            setCandidate({ ...candidate, status: newStatus });
            toast({
                title: 'Status Updated',
                description: `Candidate status set to ${newStatus}.`,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update candidate status.',
                variant: 'destructive',
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !candidate) return;

        setActionLoading(true);
        try {
            const response = await uploadUserProfilePhoto(candidate.id, file);
            if (response.success) {
                setCandidate({ ...candidate, profile_photo_url: response.url });
                toast({
                    title: 'Success',
                    description: 'Profile photo updated successfully.',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to upload profile photo.',
                variant: 'destructive',
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleRegenerateQR = async () => {
        if (!candidate) return;
        setActionLoading(true);
        try {
            const response = await regenerateCandidateQR(candidate.id);
            if (response.success) {
                setCandidate({
                    ...candidate,
                    metadata: { ...candidate.metadata, magic_token: response.token }
                });
                toast({
                    title: 'Success',
                    description: 'Login link and QR code regenerated.',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to regenerate QR code.',
                variant: 'destructive',
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleResetLogin = async () => {
        if (!candidate) return;
        setActionLoading(true);
        try {
            await resetCandidateLogin(candidate.id);
            setCandidate({
                ...candidate,
                metadata: { ...candidate.metadata, magic_token: undefined }
            });
            toast({
                title: 'Login Reset',
                description: 'Candidate login access has been cleared.',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to reset login access.',
                variant: 'destructive',
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!candidate) return;
        setActionLoading(true);
        try {
            await deleteUser(candidate.id);
            toast({
                title: 'Success',
                description: 'Candidate deleted successfully.',
            });
            router.push('/candidates');
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete candidate.',
                variant: 'destructive',
            });
            setActionLoading(false);
            setDeleteConfirm(false);
        }
    };

    const handleCopyLink = () => {
        if (!candidate?.metadata?.magic_token) return;
        const link = `${window.location.origin}/magic-login?token=${candidate.metadata.magic_token}`;
        navigator.clipboard.writeText(link);
        toast({
            title: 'Copied!',
            description: 'Login link copied to clipboard.',
        });
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!candidate) return null;

    const loginLink = candidate.metadata?.magic_token
        ? `${window.location.origin}/magic-login?token=${candidate.metadata.magic_token}`
        : null;

    const onboardingProgress = candidate.onboarding?.onboarding_completed
        ? 100
        : (candidate.onboarding?.onboarding_step || 0) * 33.3;

    return (
        <div className="p-6 lg:p-8 animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/candidates')}
                        className="hover:bg-primary/10 text-[#ea580b]"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                            Candidate Profile
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Profile ID: #{candidate.id}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge className={
                        candidate.status === 'active' ? 'bg-success/10 text-success border-success/20' :
                            candidate.status === 'pending' ? 'bg-warning/10 text-warning border-warning/20' :
                                'bg-destructive/10 text-destructive border-destructive/20'
                    }>
                        {candidate.status?.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        Created: {new Date(candidate.created_at).toLocaleDateString()}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COLUMN: Profile Info & Actions */}
                <div className="space-y-6">
                    {/* Profile Basic Info */}
                    <Card className="border-border shadow-soft overflow-hidden">
                        <CardHeader className="bg-muted/30 pb-4">
                            <div className="flex flex-col items-center text-center">
                                <div className="relative group">
                                    <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 border-2 border-primary/20 overflow-hidden">
                                        {candidate.profile_photo_url ? (
                                            <img
                                                src={candidate.profile_photo_url}
                                                alt={`${candidate.first_name} ${candidate.last_name}`}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <User className="h-12 w-12 text-primary" />
                                        )}
                                    </div>
                                    <label
                                        className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity mb-4"
                                    >
                                        <Camera className="h-6 w-6 mb-1" />
                                        <span className="text-[10px] font-medium">Update</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                            disabled={actionLoading}
                                        />
                                    </label>
                                    {actionLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full mb-4">
                                            <Loader2 className="h-6 w-6 animate-spin text-white" />
                                        </div>
                                    )}
                                </div>
                                <CardTitle className="text-xl">
                                    {candidate.first_name} {candidate.last_name || ''}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-1 mt-1">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {candidate.city || 'City not specified'}, {candidate.country || '-'}
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="p-1.5 rounded-md bg-muted">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-foreground break-all">{candidate.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="p-1.5 rounded-md bg-muted">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-foreground">{candidate.phone || 'No phone number'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="p-1.5 rounded-md bg-muted">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-foreground">
                                        Joined: {new Date(candidate.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Admin Actions */}
                    <Card className="border-border shadow-soft">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                Admin Actions
                            </CardTitle>
                            <CardDescription>Manage candidate status and account</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    className="w-full gap-2 justify-start"
                                    onClick={handleStatusToggle}
                                    disabled={actionLoading}
                                >
                                    {candidate.status === 'active' ? (
                                        <><UserX className="h-4 w-4 text-destructive" /> Deactivate</>
                                    ) : (
                                        <><UserCheck className="h-4 w-4 text-success" /> Activate</>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full gap-2 justify-start"
                                >
                                    <Pencil className="h-4 w-4" /> Edit Details
                                </Button>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full gap-2 justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteConfirm(true)}
                            >
                                <Trash2 className="h-4 w-4" /> Delete Candidate
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* MIDDLE COLUMN: Onboarding & Resume */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Onboarding Data */}
                    <Card className="border-border shadow-soft">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <GraduationCap className="h-5 w-5 text-primary" />
                                    Onboarding Data
                                </CardTitle>
                                <CardDescription>Career profile and professional details</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                                Update Data
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium">Onboarding Progress</span>
                                    <span className="text-muted-foreground">{Math.round(onboardingProgress)}%</span>
                                </div>
                                <Progress value={onboardingProgress} className="h-2" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Professional Identity</p>
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="h-4 w-4 text-primary/60" />
                                        <p className="text-sm font-medium">{candidate.onboarding?.professional_identity || 'Not specified'}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Background Category</p>
                                    <div className="flex items-center gap-2">
                                        <Target className="h-4 w-4 text-primary/60" />
                                        <p className="text-sm font-medium">{candidate.onboarding?.background_category || 'Not specified'}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Experience Level</p>
                                    <p className="text-sm font-medium">{candidate.onboarding?.experience_level || 'Not specified'}</p>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Career Objective</p>
                                    <p className="text-sm text-foreground leading-relaxed">
                                        {candidate.onboarding?.career_objective || 'No career objective provided.'}
                                    </p>
                                </div>

                                {candidate.onboarding?.onboarding_answers && Object.entries(candidate.onboarding.onboarding_answers).map(([key, value]) => (
                                    <div key={key} className="space-y-1">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </p>
                                        <p className="text-sm font-medium">{String(value)}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Resume Section */}
                        <Card className="border-border shadow-soft">
                            <CardHeader className="pb-3 border-b mb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    Resume Section
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                                    <div className="h-10 w-10 shrink-0 rounded bg-destructive/10 flex items-center justify-center">
                                        <FileText className="h-6 w-6 text-destructive" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{candidate.resume?.filename || 'Resume_not_found.pdf'}</p>
                                        <p className="text-xs text-muted-foreground">Uploaded: {candidate.resume?.upload_date || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1 gap-2">
                                        <Eye className="h-4 w-4" /> View
                                    </Button>
                                    <Button variant="outline" size="sm" className="flex-1 gap-2">
                                        <Download className="h-4 w-4" /> Download
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* QR + Login Section */}
                        <Card className="border-border shadow-soft">
                            <CardHeader className="pb-3 border-b mb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <QrCode className="h-5 w-5 text-primary" />
                                    QR + Login
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center gap-4">
                                {loginLink ? (
                                    <>
                                        <div className="bg-white p-2 rounded-lg border border-border shadow-sm">
                                            <QRCodeSVG value={loginLink} size={120} />
                                        </div>
                                        <div className="w-full space-y-2">
                                            <div className="flex items-center justify-between text-xs px-1">
                                                <span className="text-muted-foreground">Login Link</span>
                                                <button onClick={handleCopyLink} className="text-primary hover:underline flex items-center gap-1">
                                                    <Copy className="h-3 w-3" /> Copy
                                                </button>
                                            </div>
                                            <div className="p-2 bg-muted rounded border text-[10px] break-all text-muted-foreground font-mono">
                                                {loginLink}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-8 text-center space-y-3">
                                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground/50">
                                            <QrCode className="h-6 w-6" />
                                        </div>
                                        <p className="text-sm text-muted-foreground">No active login link</p>
                                        <Button size="sm" onClick={handleRegenerateQR}>Generate Access</Button>
                                    </div>
                                )}

                                <div className="flex gap-2 w-full pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 gap-2"
                                        onClick={handleRegenerateQR}
                                        disabled={actionLoading}
                                    >
                                        <RotateCw className={`h-4 w-4 ${actionLoading ? 'animate-spin' : ''}`} /> Reset Login
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Candidate Profile?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete <strong>{candidate.first_name} {candidate.last_name || ''}'s</strong> profile and all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={actionLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Permanently'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

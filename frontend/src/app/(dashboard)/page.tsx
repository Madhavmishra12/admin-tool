"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  MoreHorizontal,
  ArrowRight,
  Download,
  Calendar,
  UserCheck,
  UserX,
  Clock,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { fetchDashboardStats, DashboardStats } from '@/lib/database';

// Default empty stats
const defaultStats: DashboardStats = {
  totalUsers: 0,
  activeUsers: 0,
  pendingUsers: 0,
  inactiveUsers: 0,
  newUsersThisMonth: 0,
  newUsersLastMonth: 0,
  userGrowthPercent: 0,
  usersByDay: [],
  usersByStatus: [
    { name: 'Active', value: 0, color: 'hsl(var(--success))' },
    { name: 'Pending', value: 0, color: 'hsl(var(--warning))' },
    { name: 'Inactive', value: 0, color: 'hsl(var(--muted))' },
  ],
};

const trafficData = [
  { name: 'Organic Search', value: 41.5, color: '#cbd5e1' },
  { name: 'Direct Traffic', value: 27, color: '#94a3b8' },
  { name: 'Referral Traffic', value: 18, color: '#64748b' },
  { name: 'Social Media', value: 10.3, color: '#6366f1' },
  { name: 'Email Traffic', value: 3.2, color: '#4f46e5' },
];

const revenueData = [
  { name: 'Jan', value: 350000 },
  { name: 'Feb', value: 420000 },
  { name: 'Mar', value: 380000 },
  { name: 'Apr', value: 510000 },
  { name: 'May', value: 470000 },
  { name: 'Jun', value: 550000 },
];

const orderTimeData = [
  { time: '9am', value: 20 },
  { time: '10am', value: 35 },
  { time: '11am', value: 45 },
  { time: '12pm', value: 60 },
  { time: '1pm', value: 40 },
  { time: '2pm', value: 55 },
  { time: '3pm', value: 50 },
  { time: '4pm', value: 70 },
];

export default function DashboardPage() {
  const [revenueTab, setRevenueTab] = useState<'today' | 'week' | 'month'>('month');
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setError(null);
        const data = await fetchDashboardStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
        setError('Failed to connect to database');
        setStats(defaultStats);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const growthIsPositive = stats.userGrowthPercent >= 0;

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <span>Home</span>
        <span>›</span>
        <span className="text-foreground">Dashboard</span>
        {error && <span className="text-destructive ml-2">({error})</span>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4 lg:gap-6">
          {/* Total Users */}
          <Card className="col-span-12 md:col-span-6 lg:col-span-3 shadow-soft border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Users
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold">{stats.totalUsers.toLocaleString()}</span>
                <span className={cn(
                  "text-xs font-medium",
                  growthIsPositive ? "text-success" : "text-destructive"
                )}>
                  {growthIsPositive ? '+' : ''}{stats.userGrowthPercent.toFixed(1)}%
                </span>
              </div>
              <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.usersByDay}>
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  New this month: {stats.newUsersThisMonth}
                </span>
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
            </CardContent>
          </Card>

          {/* Active Users */}
          <Card className="col-span-12 md:col-span-6 lg:col-span-3 shadow-soft border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-success flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Active Users
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold">{stats.activeUsers.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  ({((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.usersByDay}>
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--success))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center mt-4 pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground">Real-time from database</span>
              </div>
            </CardContent>
          </Card>

          {/* Traffic Sources */}
          <Card className="col-span-12 md:col-span-6 lg:col-span-3 shadow-soft border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Traffic Sources</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 h-20 items-end mb-4">
                {trafficData.map((item, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{
                      height: `${item.value * 2}%`,
                      backgroundColor: item.color,
                    }}
                  />
                ))}
              </div>
              <div className="space-y-2">
                {trafficData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground">Annual report</span>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* User Stats - Gradient Card */}
          <Card className="col-span-12 md:col-span-6 lg:col-span-3 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground shadow-soft border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-primary-foreground/90">User Statistics</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <span className="text-4xl font-bold">{stats.totalUsers.toLocaleString()}</span>
                <p className="text-sm text-primary-foreground/70 mt-1">Total Registered</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center">
                  <p className="text-lg font-bold">{stats.pendingUsers.toLocaleString()}</p>
                  <p className="text-xs text-primary-foreground/70">Pending</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{stats.inactiveUsers.toLocaleString()}</p>
                  <p className="text-xs text-primary-foreground/70">Inactive</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Status Overview */}
          <Card className="col-span-12 md:col-span-6 lg:col-span-3 shadow-soft border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-medium">User Status</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Total <span className="font-semibold text-foreground">{stats.totalUsers.toLocaleString()}</span>
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="space-y-2 flex-1">
                  {stats.usersByStatus.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium ml-auto">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="relative w-24 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.usersByStatus}
                        innerRadius={30}
                        outerRadius={45}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {stats.usersByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Users */}
          <Card className="col-span-12 md:col-span-6 lg:col-span-3 shadow-soft border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-warning flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending Users
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold">{stats.pendingUsers.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">awaiting approval</span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground">Requires action</span>
                <ArrowRight className="w-4 h-4 text-warning" />
              </div>
            </CardContent>
          </Card>

          {/* Inactive Users */}
          <Card className="col-span-12 md:col-span-6 lg:col-span-3 shadow-soft border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserX className="w-4 h-4" />
                Inactive Users
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold">{stats.inactiveUsers.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  ({((stats.inactiveUsers / stats.totalUsers) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground">Consider re-engagement</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* User Growth */}
          <Card className="col-span-12 md:col-span-6 lg:col-span-3 shadow-soft border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">User Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-2 flex rounded-full overflow-hidden mb-4">
                <div className="bg-success" style={{ width: `${(stats.activeUsers / stats.totalUsers) * 100}%` }} />
                <div className="bg-warning" style={{ width: `${(stats.pendingUsers / stats.totalUsers) * 100}%` }} />
                <div className="bg-muted" style={{ width: `${(stats.inactiveUsers / stats.totalUsers) * 100}%` }} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm bg-success" />
                    <span className="text-muted-foreground">Active</span>
                  </div>
                  <span className="font-medium">{((stats.activeUsers / stats.totalUsers) * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm bg-warning" />
                    <span className="text-muted-foreground">Pending</span>
                  </div>
                  <span className="font-medium">{((stats.pendingUsers / stats.totalUsers) * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm bg-muted" />
                    <span className="text-muted-foreground">Inactive</span>
                  </div>
                  <span className="font-medium">{((stats.inactiveUsers / stats.totalUsers) * 100).toFixed(0)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Chart */}
          <Card className="col-span-12 lg:col-span-6 shadow-soft border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Revenue</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {(['today', 'week', 'month'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setRevenueTab(tab)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                        revenueTab === tab
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Calendar className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold">$2,56,054.50</span>
                <span className="text-sm text-success">+20% vs last month</span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v / 1000}K`} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* User Registration By Day */}
          <Card className="col-span-12 lg:col-span-6 shadow-soft border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-semibold">User Registration By Day</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Last 30 days • <span className="font-medium text-foreground">{stats.newUsersThisMonth}</span> new users this month
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {stats.usersByDay.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.usersByDay}>
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10 }} 
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12 }} 
                        allowDecimals={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  No registration data available for the last 30 days
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

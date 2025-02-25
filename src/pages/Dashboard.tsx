import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, List, Grid2X2, CheckCircle2, XCircle, ExternalLink, Loader2, Plus, X, CalendarIcon } from 'lucide-react';
import Header from '../components/Header';

type ViewMode = 'list' | 'type' | 'calendar';
type ContentItem = {
  id: string;
  caption: string;
  content_type: 'Post' | 'Story' | 'Reel' | 'TikTok';
  media_url: string;
  status: 'Approved' | 'Rejected' | 'Pending';
  schedule_date: string;
  assigned_to_profile?: {
    email: string;
    full_name: string;
  };
};

export default function Dashboard() {
  const { profile } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    caption: '',
    content_type: 'Post',
    media_url: '',
    schedule_date: format(new Date(), 'yyyy-MM-dd'),
    assigned_to: '',
  });

  const isAdmin = profile?.email === 'geral@stagelink.pt';

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_admin', false);

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: contentItems = [], isLoading: isLoadingContent, refetch } = useQuery({
    queryKey: ['content-items', profile?.id, isAdmin],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const query = supabase
        .from('content_items')
        .select(`
          *,
          assigned_to_profile:profiles!content_items_assigned_to_fkey(email, full_name)
        `)
        .order('created_at', { ascending: false });

      // If not admin, only show assigned content
      if (!isAdmin) {
        query.eq('assigned_to', profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ContentItem[];
    },
    enabled: !!profile?.id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assigned_to) {
      alert('Please select a user to assign the content to');
      return;
    }

    const { error } = await supabase.from('content_items').insert({
      ...formData,
      created_by: profile?.id,
      status: 'Pending'
    });

    if (!error) {
      setShowForm(false);
      setFormData({
        caption: '',
        content_type: 'Post',
        media_url: '',
        schedule_date: format(new Date(), 'yyyy-MM-dd'),
        assigned_to: '',
      });
      refetch();
    }
  };

  const filteredItems = contentItems.filter(item => {
    const matchesType = selectedType === 'all' || item.content_type === selectedType;
    const matchesClient = selectedClient === 'all' || item.assigned_to_profile?.email === selectedClient;
    return matchesType && matchesClient;
  });

  const handleStatusUpdate = async (id: string, status: 'Approved' | 'Rejected') => {
    const { error } = await supabase
      .from('content_items')
      .update({ status })
      .eq('id', id);

    if (!error) {
      refetch();
    }
  };

  const renderContentItem = (item: ContentItem) => (
    <div key={item.id} className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <span className="px-3 py-1 bg-black text-white rounded-full text-sm">
            {item.content_type}
          </span>
          {isAdmin && item.assigned_to_profile && (
            <div className="text-sm text-gray-500">
              Assigned to: {item.assigned_to_profile.full_name || item.assigned_to_profile.email}
            </div>
          )}
        </div>
        {item.status === 'Pending' && (
          <div className="space-x-2">
            <button
              onClick={() => handleStatusUpdate(item.id, 'Approved')}
              className="p-2 hover:bg-green-50 rounded-full transition-colors"
            >
              <CheckCircle2 className="w-6 h-6 text-gray-400 hover:text-green-500" />
            </button>
            <button
              onClick={() => handleStatusUpdate(item.id, 'Rejected')}
              className="p-2 hover:bg-red-50 rounded-full transition-colors"
            >
              <XCircle className="w-6 h-6 text-gray-400 hover:text-red-500" />
            </button>
          </div>
        )}
      </div>
      <p className="text-gray-700">{item.caption}</p>
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <a
          href={item.media_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center hover:text-black"
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          View Content
        </a>
        <span>•</span>
        <span>{format(new Date(item.schedule_date), 'MMM d, yyyy')}</span>
      </div>
      <div className={`text-sm font-medium ${
        item.status === 'Approved' ? 'text-green-500' :
        item.status === 'Rejected' ? 'text-red-500' :
        'text-yellow-500'
      }`}>
        {item.status}
      </div>
    </div>
  );

  const renderList = () => {
    if (isLoadingContent) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      );
    }

    const pendingItems = filteredItems.filter(item => item.status === 'Pending');
    const otherItems = filteredItems.filter(item => item.status !== 'Pending');

    if (filteredItems.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">No content items found</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {pendingItems.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Pending Review</h2>
            <div className="space-y-4">
              {pendingItems.map(renderContentItem)}
            </div>
          </div>
        )}
        {otherItems.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Other Content</h2>
            <div className="space-y-4">
              {otherItems.map(renderContentItem)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderByType = () => {
    if (isLoadingContent) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      );
    }

    const approvedItems = contentItems.filter(item => item.status === 'Approved');
    const types = ['Post', 'Story', 'Reel', 'TikTok'];
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {types.map(type => (
          <div key={type} className="space-y-4">
            <h3 className="text-xl font-semibold">{type}s</h3>
            {approvedItems
              .filter(item => item.content_type === type)
              .map(renderContentItem)}
          </div>
        ))}
      </div>
    );
  };

  const renderCalendar = () => {
    if (isLoadingContent) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      );
    }

    const approvedItems = contentItems.filter(item => item.status === 'Approved');
    const itemsByDate = approvedItems.reduce((acc, item) => {
      const date = format(new Date(item.schedule_date), 'yyyy-MM-dd');
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {} as Record<string, ContentItem[]>);

    if (Object.keys(itemsByDate).length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">No approved content scheduled</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {Object.entries(itemsByDate).map(([date, items]) => (
          <div key={date} className="space-y-4">
            <h3 className="text-xl font-semibold">
              {format(new Date(date), 'MMMM d, yyyy')}
            </h3>
            <div className="space-y-4">
              {items.map(renderContentItem)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Header />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex bg-white rounded-lg shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center px-4 py-2 rounded-l-lg ${
                viewMode === 'list' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <List className="w-5 h-5 mr-2" />
              List
            </button>
            <button
              onClick={() => setViewMode('type')}
              className={`flex items-center px-4 py-2 ${
                viewMode === 'type' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Grid2X2 className="w-5 h-5 mr-2" />
              By Type
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center px-4 py-2 rounded-r-lg ${
                viewMode === 'calendar' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Calendar className="w-5 h-5 mr-2" />
              Calendar
            </button>
          </div>

          <div className="flex items-center gap-4">
            {viewMode === 'list' && (
              <>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="all">All Types</option>
                  <option value="Post">Posts</option>
                  <option value="Story">Stories</option>
                  <option value="Reel">Reels</option>
                  <option value="TikTok">TikTok</option>
                </select>

                {isAdmin && (
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="all">All Clients</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.email}>
                        {profile.full_name || profile.email}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}

            {isAdmin && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Content
              </button>
            )}
          </div>
        </div>

        {viewMode === 'list' && renderList()}
        {viewMode === 'type' && renderByType()}
        {viewMode === 'calendar' && renderCalendar()}

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Add New Content</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign To
                  </label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  >
                    <option value="">Select a user</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.full_name || profile.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Caption
                  </label>
                  <textarea
                    value={formData.caption}
                    onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    required
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content Type
                    </label>
                    <select
                      value={formData.content_type}
                      onChange={(e) => setFormData({ ...formData, content_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="Post">Post</option>
                      <option value="Story">Story</option>
                      <option value="Reel">Reel</option>
                      <option value="TikTok">TikTok</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Schedule Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formData.schedule_date}
                        onChange={(e) => setFormData({ ...formData, schedule_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        required
                      />
                      <CalendarIcon className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Media URL (Google Drive)
                  </label>
                  <input
                    type="url"
                    value={formData.media_url}
                    onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
                  >
                    Create Content
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
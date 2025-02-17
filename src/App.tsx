import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { LogIn, LogOut, Check, X, Plus, Image, Video, Mail, XCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

type Post = {
  id: string;
  content: string;
  platform: string;
  status: string;
  created_at: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  client_email?: string;
};

type MediaModalProps = {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  onClose: () => void;
};

const MediaModal: React.FC<MediaModalProps> = ({ mediaUrl, mediaType, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="relative max-w-4xl w-full mx-auto">
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 text-white hover:text-gray-200 z-10"
        >
          <XCircle className="w-8 h-8" />
        </button>
        <div className="bg-white rounded-lg p-2">
          {mediaType === 'image' ? (
            <img
              src={mediaUrl}
              alt="Expanded media"
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          ) : (
            <video
              src={mediaUrl}
              controls
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          )}
        </div>
      </div>
    </div>
  );
};

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [showAddPost, setShowAddPost] = useState(false);
  const [newPost, setNewPost] = useState({
    content: '',
    platform: 'instagram',
    mediaFile: null as File | null,
    mediaType: '' as 'image' | 'video' | '',
    clientEmail: ''
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [clientEmails, setClientEmails] = useState<string[]>([]);
  const [showNewEmailInput, setShowNewEmailInput] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{
    url: string;
    type: 'image' | 'video';
  } | null>(null);

  const isStagelink = session?.user?.email === 'geral@stagelink.pt';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchPosts();
      if (isStagelink) {
        fetchClientEmails();
      }
    }
  }, [session]);

  const fetchClientEmails = async () => {
    const { data, error } = await supabase
      .from('social_media_posts')
      .select('client_email')
      .not('client_email', 'is', null);

    if (error) {
      toast.error('Error fetching client emails');
      return;
    }

    // Get unique emails and filter out null values
    const uniqueEmails = [...new Set(data.map(post => post.client_email))]
      .filter(email => email && email !== 'geral@stagelink.pt');
    
    setClientEmails(uniqueEmails);
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('social_media_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error fetching posts');
    } else {
      setPosts(data || []);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileType = file.type.startsWith('image/') ? 'image' : 'video';
      if (fileType === 'image' && !file.type.match(/^image\/(jpeg|png|gif)$/)) {
        toast.error('Please upload a valid image file (JPEG, PNG, or GIF)');
        return;
      }
      if (fileType === 'video' && !file.type.match(/^video\/(mp4|webm)$/)) {
        toast.error('Please upload a valid video file (MP4 or WebM)');
        return;
      }
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast.error('File size must be less than 100MB');
        return;
      }
      setNewPost(prev => ({
        ...prev,
        mediaFile: file,
        mediaType: fileType
      }));
    }
  };

  const handleClientEmailChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'new') {
      setShowNewEmailInput(true);
      setNewPost(prev => ({ ...prev, clientEmail: '' }));
    } else {
      setShowNewEmailInput(false);
      setNewPost(prev => ({ ...prev, clientEmail: value }));
    }
  };

  const handleNewEmailInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPost(prev => ({ ...prev, clientEmail: e.target.value }));
  };

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.content || !newPost.platform || !newPost.clientEmail) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newPost.clientEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    let mediaUrl = '';
    if (newPost.mediaFile) {
      const fileExt = newPost.mediaFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('media')
        .upload(filePath, newPost.mediaFile, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            setUploadProgress((progress.loaded / progress.total) * 100);
          }
        });

      if (uploadError) {
        toast.error('Error uploading media');
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      mediaUrl = publicUrl;
    }

    const { error } = await supabase
      .from('social_media_posts')
      .insert([
        {
          content: newPost.content,
          platform: newPost.platform,
          user_id: session.user.id,
          media_url: mediaUrl || null,
          media_type: newPost.mediaType || null,
          client_email: newPost.clientEmail
        }
      ]);

    if (error) {
      toast.error('Error creating post');
    } else {
      toast.success('Post created successfully');
      setNewPost({
        content: '',
        platform: 'instagram',
        mediaFile: null,
        mediaType: '',
        clientEmail: ''
      });
      setShowNewEmailInput(false);
      setUploadProgress(0);
      setShowAddPost(false);
      fetchPosts();
      fetchClientEmails();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Check if it's an invalid user error
        if (signInError.message.includes('Invalid login credentials')) {
          // Try to sign up to check if the user exists
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
          });

          if (signUpError) {
            // If sign up fails with "User already registered", it means the password was wrong
            if (signUpError.message.includes('User already registered')) {
              toast.error('Incorrect password');
            } else {
              toast.error('This email is not registered in our system');
            }
          } else {
            toast.error('This email is not registered in our system');
          }
        } else {
          toast.error('An error occurred during login');
        }
        return;
      }

      toast.success('Logged in successfully');
    } catch (error: any) {
      toast.error('An error occurred during login');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
  };

  const handleApproval = async (postId: string, approved: boolean) => {
    const { error } = await supabase
      .from('social_media_posts')
      .update({ status: approved ? 'approved' : 'rejected', approved_at: new Date().toISOString() })
      .eq('id', postId);

    if (error) {
      toast.error('Error updating post status');
    } else {
      toast.success(`Post ${approved ? 'approved' : 'rejected'} successfully`);
      fetchPosts();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <div className="text-center mb-8">
            <Mail className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Social Media Approval System</h1>
            <p className="mt-2 text-sm text-gray-600">
              Please log in with your email to review and approve posts
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />
      {selectedMedia && (
        <MediaModal
          mediaUrl={selectedMedia.url}
          mediaType={selectedMedia.type}
          onClose={() => setSelectedMedia(null)}
        />
      )}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Social Media Approval Dashboard</h1>
            </div>
            <div className="flex items-center">
              <div className="mr-4">
                <span className="text-sm text-gray-500">Logged in as</span>
                <span className="ml-2 text-sm font-medium text-gray-900">{session.user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {!isStagelink && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900">Welcome back!</h2>
              <p className="mt-1 text-sm text-gray-500">
                Here are your pending social media posts for review. Please approve or reject them.
              </p>
            </div>
          )}

          {isStagelink && (
            <div className="mb-6">
              {!showAddPost ? (
                <button
                  onClick={() => setShowAddPost(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add New Post
                </button>
              ) : (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-4">Add New Social Media Post</h2>
                  <form onSubmit={handleAddPost} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700">
                        Client Email
                      </label>
                      {!showNewEmailInput ? (
                        <div className="flex items-center space-x-2">
                          <select
                            id="clientEmail"
                            value={newPost.clientEmail}
                            onChange={handleClientEmailChange}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                          >
                            <option value="">Select a client email</option>
                            {clientEmails.map((email) => (
                              <option key={email} value={email}>
                                {email}
                              </option>
                            ))}
                            <option value="new">Add new email...</option>
                          </select>
                          {newPost.clientEmail && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowNewEmailInput(true);
                                setNewPost(prev => ({ ...prev, clientEmail: '' }));
                              }}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Change
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <input
                            type="email"
                            value={newPost.clientEmail}
                            onChange={handleNewEmailInput}
                            placeholder="Enter client email"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setShowNewEmailInput(false);
                              setNewPost(prev => ({ ...prev, clientEmail: '' }));
                            }}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label htmlFor="platform" className="block text-sm font-medium text-gray-700">
                        Platform
                      </label>
                      <select
                        id="platform"
                        value={newPost.platform}
                        onChange={(e) => setNewPost(prev => ({ ...prev, platform: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook</option>
                        <option value="twitter">Twitter</option>
                        <option value="linkedin">LinkedIn</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                        Content
                      </label>
                      <textarea
                        id="content"
                        value={newPost.content}
                        onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                        rows={4}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Media (Image or Video)
                      </label>
                      <div className="mt-1 flex items-center">
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleFileChange}
                          className="sr-only"
                          id="media-upload"
                        />
                        <label
                          htmlFor="media-upload"
                          className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          {newPost.mediaType === 'image' ? (
                            <Image className="w-5 h-5 mr-2" />
                          ) : newPost.mediaType === 'video' ? (
                            <Video className="w-5 h-5 mr-2" />
                          ) : (
                            <Plus className="w-5 h-5 mr-2" />
                          )}
                          {newPost.mediaFile ? 'Change Media' : 'Upload Media'}
                        </label>
                        {newPost.mediaFile && (
                          <span className="ml-4 text-sm text-gray-600">
                            {newPost.mediaFile.name}
                          </span>
                        )}
                      </div>
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="mt-2">
                          <div className="bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-4">
                      <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Submit Post
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddPost(false);
                          setNewPost({
                            content: '',
                            platform: 'instagram',
                            mediaFile: null,
                            mediaType: '',
                            clientEmail: ''
                          });
                          setShowNewEmailInput(false);
                        }}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Content
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Media
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    {isStagelink && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {posts.map((post) => (
                    <tr key={post.id}>
                      <td className="px-6 py-4 whitespace-normal">
                        <div className="text-sm text-gray-900">{post.content}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{post.platform}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {post.media_url && post.media_type && (
                          <div 
                            className="h-20 w-20 cursor-pointer transition-transform hover:scale-105"
                            onClick={() => setSelectedMedia({
                              url: post.media_url!,
                              type: post.media_type as 'image' | 'video'
                            })}
                          >
                            {post.media_type === 'image' ? (
                              <img
                                src={post.media_url}
                                alt="Post media"
                                className="h-full w-full object-cover rounded"
                              />
                            ) : (
                              <video
                                src={post.media_url}
                                className="h-full w-full object-cover rounded"
                              />
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            post.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : post.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {post.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(post.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      {isStagelink && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{post.client_email}</div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {post.status === 'pending' && !isStagelink && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApproval(post.id, true)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleApproval(post.id, false)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
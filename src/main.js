import { supabase } from './lib/supabase.js';
import './index.css';

// Initialize Lucide icons
lucide.createIcons();

let session = null;
let clientEmails = [];
let currentView = {
  client: null,
  month: null
};

// Show toast message
function showToast(message, type = 'success') {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: type === 'success' ? "#4CAF50" : "#f44336",
    }).showToast();
}

// Format date for display
function formatMonth(date) {
    return new Date(date).toLocaleString('default', { month: 'long', year: 'numeric' });
}

// Group posts by client and month
function groupPosts(posts) {
    const grouped = {};
    posts.forEach(post => {
        const client = post.client_email;
        const month = new Date(post.created_at).toISOString().slice(0, 7); // YYYY-MM format
        
        if (!grouped[client]) {
            grouped[client] = {};
        }
        if (!grouped[client][month]) {
            grouped[client][month] = [];
        }
        grouped[client][month].push(post);
    });
    return grouped;
}

// Render client folders
function renderClientFolders(groupedPosts) {
    const container = document.getElementById('postsContainer');
    container.innerHTML = '';

    // Create folders view
    const foldersDiv = document.createElement('div');
    foldersDiv.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6';

    Object.keys(groupedPosts).sort().forEach(client => {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:bg-gray-50 transition-colors';
        folderDiv.onclick = () => showClientPosts(client, groupedPosts[client]);

        const monthCount = Object.keys(groupedPosts[client]).length;
        const totalPosts = Object.values(groupedPosts[client])
            .reduce((sum, posts) => sum + posts.length, 0);

        folderDiv.innerHTML = `
            <div class="flex items-center space-x-3">
                <i data-lucide="folder" class="w-8 h-8 text-blue-500"></i>
                <div>
                    <h3 class="font-medium text-gray-900">${client}</h3>
                    <p class="text-sm text-gray-500">
                        ${monthCount} ${monthCount === 1 ? 'month' : 'months'} • 
                        ${totalPosts} ${totalPosts === 1 ? 'post' : 'posts'}
                    </p>
                </div>
            </div>
        `;

        foldersDiv.appendChild(folderDiv);
    });

    container.appendChild(foldersDiv);
    lucide.createIcons();
}

// Show client's posts grouped by month
function showClientPosts(client, monthlyPosts) {
    currentView.client = client;
    currentView.month = null;

    const container = document.getElementById('postsContainer');
    container.innerHTML = '';

    // Add navigation
    const nav = document.createElement('div');
    nav.className = 'flex items-center space-x-2 mb-6';
    nav.innerHTML = `
        <button class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <i data-lucide="chevron-left" class="w-4 h-4 mr-1"></i>
            Back to Clients
        </button>
        <span class="text-gray-500">/</span>
        <span class="font-medium text-gray-900">${client}</span>
    `;
    nav.querySelector('button').onclick = () => {
        currentView.client = null;
        fetchPosts();
    };
    container.appendChild(nav);

    // Create months grid
    const monthsDiv = document.createElement('div');
    monthsDiv.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';

    Object.entries(monthlyPosts)
        .sort((a, b) => b[0].localeCompare(a[0])) // Sort months in descending order
        .forEach(([month, posts]) => {
            const monthDiv = document.createElement('div');
            monthDiv.className = 'bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:bg-gray-50 transition-colors';
            monthDiv.onclick = () => showMonthPosts(client, month, posts);

            const pendingPosts = posts.filter(post => post.status === 'pending').length;

            monthDiv.innerHTML = `
                <div class="flex items-center space-x-3">
                    <i data-lucide="calendar" class="w-8 h-8 text-blue-500"></i>
                    <div>
                        <h3 class="font-medium text-gray-900">${formatMonth(month)}</h3>
                        <p class="text-sm text-gray-500">
                            ${posts.length} ${posts.length === 1 ? 'post' : 'posts'}
                            ${pendingPosts > 0 ? ` • ${pendingPosts} pending` : ''}
                        </p>
                    </div>
                </div>
            `;

            monthsDiv.appendChild(monthDiv);
        });

    container.appendChild(monthsDiv);
    lucide.createIcons();
}

// Show posts for a specific month
function showMonthPosts(client, month, posts) {
    currentView.month = month;

    const container = document.getElementById('postsContainer');
    container.innerHTML = '';

    // Add navigation
    const nav = document.createElement('div');
    nav.className = 'flex items-center space-x-2 mb-6';
    nav.innerHTML = `
        <button class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <i data-lucide="chevron-left" class="w-4 h-4 mr-1"></i>
            Back to Months
        </button>
        <span class="text-gray-500">/</span>
        <span class="font-medium text-gray-900">${client}</span>
        <span class="text-gray-500">/</span>
        <span class="font-medium text-gray-900">${formatMonth(month)}</span>
    `;
    nav.querySelector('button').onclick = () => showClientPosts(client, groupPosts(posts)[client]);
    container.appendChild(nav);

    // Create posts table
    const tableDiv = document.createElement('div');
    tableDiv.className = 'bg-white rounded-lg shadow';
    tableDiv.innerHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Media</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${posts.map(post => `
                        <tr>
                            <td class="px-6 py-4 whitespace-normal">
                                <div class="text-sm text-gray-900">${post.content}</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm text-gray-900">${post.platform}</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                ${post.media_url ? `
                                    <div class="h-20 w-20">
                                        ${post.media_type === 'image' 
                                            ? `<img src="${post.media_url}" alt="Post media" class="h-full w-full object-cover rounded">`
                                            : `<video src="${post.media_url}" class="h-full w-full object-cover rounded" controls></video>`
                                        }
                                    </div>
                                ` : ''}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    post.status === 'approved'
                                        ? 'bg-green-100 text-green-800'
                                        : post.status === 'rejected'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                }">
                                    ${post.status}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm text-gray-900">
                                    ${new Date(post.created_at).toLocaleDateString()}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    container.appendChild(tableDiv);
}

// Fetch posts with organization
async function fetchPosts() {
    const { data, error } = await supabase
        .from('social_media_posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        showToast('Error fetching posts', 'error');
        return;
    }

    if (session?.user?.email === 'geral@stagelink.pt') {
        const groupedPosts = groupPosts(data);
        
        if (currentView.client) {
            if (currentView.month) {
                const monthPosts = groupedPosts[currentView.client][currentView.month];
                showMonthPosts(currentView.client, currentView.month, monthPosts);
            } else {
                showClientPosts(currentView.client, groupedPosts[currentView.client]);
            }
        } else {
            renderClientFolders(groupedPosts);
        }
    } else {
        const tbody = document.getElementById('postsTableBody');
        tbody.innerHTML = '';

        data.forEach(post => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-normal">
                    <div class="text-sm text-gray-900">${post.content}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${post.platform}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${post.media_url ? `
                        <div class="h-20 w-20">
                            ${post.media_type === 'image' 
                                ? `<img src="${post.media_url}" alt="Post media" class="h-full w-full object-cover rounded">`
                                : `<video src="${post.media_url}" class="h-full w-full object-cover rounded" controls></video>`
                            }
                        </div>
                    ` : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        post.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : post.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                    }">
                        ${post.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                        ${new Date(post.created_at).toLocaleDateString()}
                    </div>
                </td>
                ${session?.user?.email === 'geral@stagelink.pt' ? `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${post.client_email || ''}</div>
                    </td>
                ` : ''}
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    ${post.status === 'pending' && session?.user?.email !== 'geral@stagelink.pt' ? `
                        <div class="flex space-x-2">
                            <button onclick="handleApproval('${post.id}', true)" class="text-green-600 hover:text-green-900">
                                <i data-lucide="check" class="w-5 h-5"></i>
                            </button>
                            <button onclick="handleApproval('${post.id}', false)" class="text-red-600 hover:text-red-900">
                                <i data-lucide="x" class="w-5 h-5"></i>
                            </button>
                        </div>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    lucide.createIcons();
}

// Handle login
document.getElementById('loginFormElement')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        
        showToast('Logged in successfully');
        session = data.session;
        updateUI();
        fetchPosts();
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// Handle logout
document.getElementById('logoutButton')?.addEventListener('click', async () => {
    try {
        await supabase.auth.signOut();
        session = null;
        updateUI();
        showToast('Logged out successfully');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error logging out', 'error');
    }
});

// Update UI based on session
function updateUI() {
    const loginForm = document.getElementById('loginForm');
    const dashboard = document.getElementById('dashboard');
    const userEmail = document.getElementById('userEmail');
    const stagelinkControls = document.getElementById('stagelinkControls');
    const clientWelcome = document.getElementById('clientWelcome');
    const postsTable = document.getElementById('postsTable');

    if (!loginForm || !dashboard) return; // Guard clause for missing elements

    if (session) {
        loginForm.classList.add('hidden');
        dashboard.classList.remove('hidden');
        if (userEmail) userEmail.textContent = session.user.email;

        const isStagelink = session.user.email === 'geral@stagelink.pt';
        
        if (stagelinkControls) stagelinkControls.classList.toggle('hidden', !isStagelink);
        if (clientWelcome) clientWelcome.classList.toggle('hidden', isStagelink);
        if (postsTable) postsTable.classList.toggle('hidden', isStagelink);

        if (isStagelink) {
            fetchClientEmails();
        }
    } else {
        loginForm.classList.remove('hidden');
        dashboard.classList.add('hidden');
    }
}

// Fetch client emails
async function fetchClientEmails() {
    const { data, error } = await supabase
        .from('social_media_posts')
        .select('client_email')
        .not('client_email', 'is', null);

    if (error) {
        showToast('Error fetching client emails', 'error');
        return;
    }

    clientEmails = [...new Set(data.map(post => post.client_email))]
        .filter(email => email && email !== 'geral@stagelink.pt');

    const select = document.getElementById('clientEmail');
    select.innerHTML = `
        <option value="">Select a client email</option>
        ${clientEmails.map(email => `<option value="${email}">${email}</option>`).join('')}
        <option value="new">Add new email...</option>
    `;
}

// Handle approval
window.handleApproval = async function(postId, approved) {
    const { error } = await supabase
        .from('social_media_posts')
        .update({ 
            status: approved ? 'approved' : 'rejected',
            approved_at: new Date().toISOString()
        })
        .eq('id', postId);

    if (error) {
        showToast('Error updating post status', 'error');
    } else {
        showToast(`Post ${approved ? 'approved' : 'rejected'} successfully`);
        fetchPosts();
    }
}

// Handle add post form
document.getElementById('addPostButton')?.addEventListener('click', () => {
    document.getElementById('addPostForm').classList.remove('hidden');
    document.getElementById('addPostButton').classList.add('hidden');
});

document.getElementById('cancelPostButton')?.addEventListener('click', () => {
    document.getElementById('addPostForm').classList.add('hidden');
    document.getElementById('addPostButton').classList.remove('hidden');
    document.getElementById('newPostForm').reset();
    document.getElementById('newEmailInput').classList.add('hidden');
    document.getElementById('selectedFileName').textContent = '';
});

// Handle client email selection
document.getElementById('clientEmail')?.addEventListener('change', (e) => {
    const newEmailInput = document.getElementById('newEmailInput');
    if (e.target.value === 'new') {
        newEmailInput.classList.remove('hidden');
    } else {
        newEmailInput.classList.add('hidden');
    }
});

// Handle file upload
document.getElementById('media-upload')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
        document.getElementById('selectedFileName').textContent = file.name;
    }
});

// Handle new post submission
document.getElementById('newPostForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let clientEmail;
    const selectedOption = document.getElementById('clientEmail').value;
    
    if (selectedOption === 'new') {
        clientEmail = document.getElementById('newClientEmail').value;
        if (!clientEmail) {
            showToast('Please enter a new client email', 'error');
            return;
        }
    } else if (!selectedOption) {
        showToast('Please select a client email', 'error');
        return;
    } else {
        clientEmail = selectedOption;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    const content = document.getElementById('content').value;
    const platform = document.getElementById('platform').value;
    const file = document.getElementById('media-upload').files[0];
    
    let mediaUrl = '';
    let mediaType = '';

    if (file) {
        const fileType = file.type.startsWith('image/') ? 'image' : 'video';
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${session.user.id}/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
            .from('media')
            .upload(filePath, file);

        if (uploadError) {
            showToast('Error uploading media', 'error');
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(filePath);

        mediaUrl = publicUrl;
        mediaType = fileType;
    }

    const { error } = await supabase
        .from('social_media_posts')
        .insert([{
            content,
            platform,
            user_id: session.user.id,
            media_url: mediaUrl || null,
            media_type: mediaType || null,
            client_email: clientEmail
        }]);

    if (error) {
        showToast('Error creating post', 'error');
        console.error('Post creation error:', error);
    } else {
        showToast('Post created successfully');
        document.getElementById('newPostForm').reset();
        document.getElementById('addPostForm').classList.add('hidden');
        document.getElementById('addPostButton').classList.remove('hidden');
        document.getElementById('newEmailInput').classList.add('hidden');
        document.getElementById('selectedFileName').textContent = '';
        fetchPosts();
    }
});
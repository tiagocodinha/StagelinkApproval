import { supabase } from './lib/supabase.js';
import './index.css';

// Initialize Lucide icons
lucide.createIcons();

let session = null;
let clientEmails = [];

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

// Handle login
document.getElementById('loginFormElement').addEventListener('submit', async (e) => {
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
document.getElementById('logoutButton').addEventListener('click', async () => {
    await supabase.auth.signOut();
    session = null;
    updateUI();
    showToast('Logged out successfully');
});

// Update UI based on session
function updateUI() {
    const loginForm = document.getElementById('loginForm');
    const dashboard = document.getElementById('dashboard');
    const userEmail = document.getElementById('userEmail');
    const stagelinkControls = document.getElementById('stagelinkControls');
    const clientWelcome = document.getElementById('clientWelcome');
    const clientHeader = document.getElementById('clientHeader');

    if (session) {
        loginForm.classList.add('hidden');
        dashboard.classList.remove('hidden');
        userEmail.textContent = session.user.email;

        const isStagelink = session.user.email === 'geral@stagelink.pt';
        stagelinkControls.classList.toggle('hidden', !isStagelink);
        clientWelcome.classList.toggle('hidden', isStagelink);
        clientHeader.classList.toggle('hidden', !isStagelink);

        if (isStagelink) {
            fetchClientEmails();
        }
    } else {
        loginForm.classList.remove('hidden');
        dashboard.classList.add('hidden');
    }
}

// Fetch posts
async function fetchPosts() {
    const { data, error } = await supabase
        .from('social_media_posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        showToast('Error fetching posts', 'error');
        return;
    }

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

    // Reinitialize Lucide icons for new content
    lucide.createIcons();
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
    const formData = new FormData(e.target);
    const clientEmail = formData.get('clientEmail') === 'new' 
        ? document.getElementById('newClientEmail').value 
        : formData.get('clientEmail');
    
    if (!clientEmail) {
        showToast('Please provide a client email', 'error');
        return;
    }

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
            content: formData.get('content'),
            platform: formData.get('platform'),
            user_id: session.user.id,
            media_url: mediaUrl || null,
            media_type: mediaType || null,
            client_email: clientEmail
        }]);

    if (error) {
        showToast('Error creating post', 'error');
    } else {
        showToast('Post created successfully');
        document.getElementById('addPostForm').classList.add('hidden');
        document.getElementById('addPostButton').classList.remove('hidden');
        document.getElementById('newPostForm').reset();
        document.getElementById('newEmailInput').classList.add('hidden');
        document.getElementById('selectedFileName').textContent = '';
        fetchPosts();
        fetchClientEmails();
    }
});

// Check for existing session on page load
supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
    session = currentSession;
    updateUI();
    if (session) {
        fetchPosts();
    }
});
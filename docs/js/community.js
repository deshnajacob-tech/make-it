const STORAGE = {
  currentUser: 'gamehub_user',
  friends: 'gamehub_friends',
  users: 'gamehub_users',
  communityGames: 'gamehub_community_games',
};

const DEFAULT_USERS = ['Alex', 'Mia', 'Casey', 'Noah', 'Zoe'];
const DEFAULT_COMMUNITY_GAMES = [
  { id: 'cg1', title: 'Fast Coins', author: 'Alex', description: 'Collect all coins before time runs out.', created: '2 days ago' },
  { id: 'cg2', title: 'Maze Escape', author: 'Mia', description: 'Find your way through a dark labyrinth.', created: '5 days ago' },
];

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getCurrentUser() {
  return readJSON(STORAGE.currentUser, null);
}

function setCurrentUser(name) {
  saveJSON(STORAGE.currentUser, { name });
}

function getAllUsers() {
  return readJSON(STORAGE.users, DEFAULT_USERS);
}

function getAllFriends() {
  return readJSON(STORAGE.friends, {});
}

function saveFriends(data) {
  saveJSON(STORAGE.friends, data);
}

function getCommunityGames() {
  return readJSON(STORAGE.communityGames, DEFAULT_COMMUNITY_GAMES);
}

function saveCommunityGames(games) {
  saveJSON(STORAGE.communityGames, games);
}

function initCommunityApp() {
  if (!localStorage.getItem(STORAGE.users)) saveJSON(STORAGE.users, DEFAULT_USERS);
  if (!localStorage.getItem(STORAGE.communityGames)) saveCommunityGames(DEFAULT_COMMUNITY_GAMES);
  if (!localStorage.getItem(STORAGE.friends)) saveJSON(STORAGE.friends, {});
  attachCommunityListeners();
  renderUserState();
  renderFriendArea();
  renderCommunityGames();
}

function attachCommunityListeners() {
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const closeModal = document.getElementById('closeSignInModal');
  const signInForm = document.getElementById('signInForm');
  const uploadForm = document.getElementById('uploadForm');
  const authButtons = document.querySelectorAll('.requires-auth');
  const openUploadBtn = document.getElementById('openUploadBtn');

  if (signInBtn) signInBtn.addEventListener('click', openSignInModal);
  if (signOutBtn) signOutBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE.currentUser);
    renderUserState();
    renderFriendArea();
    renderCommunityGames();
  });
  if (closeModal) closeModal.addEventListener('click', closeSignInModal);
  if (signInForm) signInForm.addEventListener('submit', handleSignIn);
  if (uploadForm) uploadForm.addEventListener('submit', handleUploadGame);
  if (openUploadBtn) openUploadBtn.addEventListener('click', () => {
    const uploadSection = document.getElementById('uploadSection');
    if (!getCurrentUser()) return openSignInModal();
    if (uploadSection) uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  authButtons.forEach(button => {
    button.addEventListener('click', event => {
      if (!getCurrentUser()) {
        event.preventDefault();
        openSignInModal();
      }
    });
  });
}

function openSignInModal() {
  const modal = document.getElementById('signInModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  const input = document.getElementById('signInName');
  if (input) input.focus();
}

function closeSignInModal() {
  const modal = document.getElementById('signInModal');
  if (!modal) return;
  modal.classList.add('hidden');
}

function handleSignIn(event) {
  event.preventDefault();
  const input = document.getElementById('signInName');
  if (!input) return;
  const username = input.value.trim();
  if (!username) return;

  const users = getAllUsers();
  if (!users.includes(username)) {
    users.push(username);
    saveJSON(STORAGE.users, users);
  }

  const friends = getAllFriends();
  if (!friends[username]) friends[username] = [];
  saveFriends(friends);
  setCurrentUser(username);
  input.value = '';
  renderUserState();
  renderFriendArea();
  renderCommunityGames();
  closeSignInModal();
}

function handleUploadGame(event) {
  event.preventDefault();
  const user = getCurrentUser();
  if (!user) return openSignInModal();

  const title = document.getElementById('uploadTitle')?.value.trim();
  const description = document.getElementById('uploadDescription')?.value.trim();
  const template = document.getElementById('uploadTemplate')?.value || 'Custom';
  if (!title || !description) return;

  const games = getCommunityGames();
  games.unshift({
    id: `cg-${Date.now()}`,
    title,
    author: user.name,
    description: `${description} (${template})`,
    created: 'Just now',
  });
  saveCommunityGames(games);

  const status = document.getElementById('uploadStatus');
  if (status) {
    status.textContent = 'Uploaded! Your game is now visible in the community list.';
  }

  event.target.reset();
  renderCommunityGames();
}

function renderUserState() {
  const user = getCurrentUser();
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const profileName = document.querySelectorAll('.account-name');

  if (user) {
    if (signInBtn) signInBtn.textContent = `Hi, ${user.name}`;
    if (signOutBtn) signOutBtn.classList.remove('hidden');
    profileName.forEach(el => { el.textContent = user.name; });
  } else {
    if (signInBtn) signInBtn.textContent = 'Sign In';
    if (signOutBtn) signOutBtn.classList.add('hidden');
    profileName.forEach(el => { el.textContent = 'Guest'; });
  }

  renderStats();
}

function renderStats() {
  const friendCountEl = document.querySelector('.friends-count');
  const communityGamesCountEl = document.querySelector('.community-games-count');
  const user = getCurrentUser();
  const friendCount = user ? (getAllFriends()[user.name] || []).length : 0;
  const gameCount = getCommunityGames().length;
  if (friendCountEl) friendCountEl.textContent = friendCount;
  if (communityGamesCountEl) communityGamesCountEl.textContent = gameCount;
}

function renderFriendArea() {
  const user = getCurrentUser();
  const container = document.getElementById('friendList');
  if (!container) return;
  if (!user) {
    container.innerHTML = `
      <div class="community-card">
        <p class="sign-in-message">Sign in to add friends, chat with players, and share your game creations.</p>
      </div>
    `;
    return;
  }

  const friends = getAllFriends()[user.name] || [];
  const users = getAllUsers().filter(name => name !== user.name && !friends.includes(name));
  container.innerHTML = `
    <div class="community-card">
      <h3>Your Friends</h3>
      <div class="list-grid">${friends.length
        ? friends.map(name => `<div class="friend-card"><span>${name}</span><span class="small-chip">Friend</span></div>`).join('')
        : '<p>No friends yet. Add players from the community below.</p>'}
      </div>
    </div>
    <div class="community-card">
      <h3>Add Players</h3>
      <div class="list-grid">${users.length
        ? users.map(name => `<button class="btn btn-sm btn-ghost add-friend-btn" data-name="${name}">${name}</button>`).join('')
        : '<p>All available players are already your friends.</p>'}
      </div>
    </div>
  `;

  container.querySelectorAll('.add-friend-btn').forEach(btn => {
    btn.addEventListener('click', () => addFriend(btn.dataset.name));
  });
}

function addFriend(name) {
  const user = getCurrentUser();
  if (!user) return openSignInModal();
  const friends = getAllFriends();
  const current = friends[user.name] || [];
  if (!current.includes(name)) {
    current.push(name);
    friends[user.name] = current;
    saveFriends(friends);
    renderFriendArea();
    renderStats();
  }
}

function renderCommunityGames() {
  const container = document.getElementById('communityGameList');
  if (!container) return;
  const games = getCommunityGames();
  if (!games.length) {
    container.innerHTML = '<div class="community-card"><p>No community uploads yet.</p></div>';
    return;
  }

  container.innerHTML = games.slice(0, 6).map(game => `
    <div class="community-card">
      <h4>${game.title}</h4>
      <p>${game.description}</p>
      <div class="list-row"><span class="small-chip">${game.author}</span><span>${game.created}</span></div>
    </div>
  `).join('');
  renderStats();
}

window.addEventListener('DOMContentLoaded', initCommunityApp);

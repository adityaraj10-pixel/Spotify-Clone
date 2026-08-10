document.addEventListener('DOMContentLoaded', () => {
 
  // ---------- Element refs ----------
  const playBtn      = document.getElementById('playBtn');
  const prevBtn       = document.getElementById('prevBtn');
  const nextBtn       = document.getElementById('nextBtn');
  const shuffleBtn    = document.getElementById('shuffleBtn');
  const repeatBtn     = document.getElementById('repeatBtn');
  const progressBar   = document.getElementById('progressBar');
  const currTimeEl    = document.getElementById('currTime');
  const totTimeEl     = document.getElementById('totTime');
  const volumeBar     = document.getElementById('volumeBar');
  const volIcon       = document.getElementById('volIcon');
  const npCover       = document.getElementById('npCover');
  const npTitle       = document.getElementById('npTitle');
  const npArtist      = document.getElementById('npArtist');
  const npLike        = document.getElementById('npLike');
  const queueBtn      = document.getElementById('queueBtn');
  const queuePanel    = document.getElementById('queuePanel');
  const closeQueue    = document.getElementById('closeQueue');
  const queueNowItem  = document.getElementById('queueNowItem');
  const queueList     = document.getElementById('queueList');
  const toast         = document.getElementById('toast');
  const searchWrap    = document.getElementById('searchWrap');
  const searchInput   = document.getElementById('searchInput');
  const navOptions    = document.querySelectorAll('.nav-option');
  const playlistList  = document.getElementById('playlistList');
  const createPlaylistBtn  = document.getElementById('createPlaylistBtn');
  const createPlaylistIcon = document.getElementById('createPlaylistIcon');
  const browsePodcastBtn   = document.getElementById('browsePodcastBtn');
 
  // ---------- Build the track list from every playable card ----------
  const trackEls = Array.from(document.querySelectorAll('.card[data-title], .artist-card[data-title]'));
 
  const tracks = trackEls.map((el, i) => ({
    el,
    title: el.dataset.title,
    artist: el.dataset.artist,
    duration: parseInt(el.dataset.duration, 10) || 210,
    cover: el.querySelector('.card-img').src,
    liked: false
  }));
 
  let currentIndex = -1;
  let isPlaying = false;
  let currentSeconds = 0;
  let tickHandle = null;
  let shuffle = false;
  let repeat = false; // repeat current track
 
  // ---------- Helpers ----------
  function formatTime(sec){
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }
 
  function showToast(message){
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
  }
 
  function renderQueue(){
    // now playing entry
    queueNowItem.innerHTML = '';
    if(currentIndex > -1){
      const t = tracks[currentIndex];
      queueNowItem.innerHTML = `
        <img class="qi-cover" src="${t.cover}" alt="${t.title}">
        <div class="qi-info">
          <p class="qi-title">${t.title}</p>
          <p class="qi-artist">${t.artist}</p>
        </div>`;
    } else {
      queueNowItem.innerHTML = `<p class="qi-artist">Nothing playing yet</p>`;
    }
 
    // upcoming list = remaining tracks in order after current
    queueList.innerHTML = '';
    const upcoming = [];
    for(let i = 1; i <= tracks.length - 1; i++){
      const idx = (currentIndex + i) % tracks.length;
      if(currentIndex === -1 && upcoming.length >= tracks.length - 1) break;
      upcoming.push(idx);
      if(upcoming.length >= 10) break; // keep the panel light
    }
 
    upcoming.forEach(idx => {
      const t = tracks[idx];
      const item = document.createElement('div');
      item.className = 'queue-item';
      item.innerHTML = `
        <img class="qi-cover" src="${t.cover}" alt="${t.title}">
        <div class="qi-info">
          <p class="qi-title">${t.title}</p>
          <p class="qi-artist">${t.artist}</p>
        </div>`;
      item.addEventListener('click', () => playTrackByIndex(idx));
      queueList.appendChild(item);
    });
  }
 
  function clearPlayingHighlight(){
    trackEls.forEach(el => el.classList.remove('playing'));
  }
 
  function loadTrack(index, autoplay = true){
    if(index < 0 || index >= tracks.length) return;
    currentIndex = index;
    const t = tracks[index];
 
    clearPlayingHighlight();
    t.el.classList.add('playing');
 
    npTitle.textContent = t.title;
    npArtist.textContent = t.artist;
    npCover.src = t.cover;
    npCover.alt = t.title;
 
    npLike.classList.toggle('liked', t.liked);
    npLike.className = `fa-heart np-like ${t.liked ? 'fa-solid liked' : 'fa-regular'}`;
 
    currentSeconds = 0;
    totTimeEl.textContent = formatTime(t.duration);
    currTimeEl.textContent = '00:00';
    progressBar.max = t.duration;
    progressBar.value = 0;
 
    renderQueue();
 
    if(autoplay) play();
  }
 
  function play(){
    if(currentIndex === -1){
      loadTrack(0);
      return;
    }
    isPlaying = true;
    playBtn.classList.remove('fa-circle-play');
    playBtn.classList.add('fa-circle-pause');
    startTicking();
  }
 
  function pause(){
    isPlaying = false;
    playBtn.classList.remove('fa-circle-pause');
    playBtn.classList.add('fa-circle-play');
    stopTicking();
  }
 
  function togglePlay(){
    isPlaying ? pause() : play();
  }
 
  function startTicking(){
    stopTicking();
    tickHandle = setInterval(() => {
      const track = tracks[currentIndex];
      currentSeconds += 1;
      if(currentSeconds >= track.duration){
        if(repeat){
          currentSeconds = 0;
        } else {
          nextTrack();
          return;
        }
      }
      currTimeEl.textContent = formatTime(currentSeconds);
      progressBar.value = currentSeconds;
    }, 1000);
  }
 
  function stopTicking(){
    if(tickHandle) clearInterval(tickHandle);
    tickHandle = null;
  }
 
  function nextTrack(){
    if(tracks.length === 0) return;
    let idx;
    if(shuffle){
      idx = Math.floor(Math.random() * tracks.length);
    } else {
      idx = (currentIndex + 1) % tracks.length;
    }
    loadTrack(idx, true);
  }
 
  function prevTrack(){
    if(tracks.length === 0) return;
    // if a few seconds in, restart current track (like real Spotify)
    if(currentSeconds > 3){
      currentSeconds = 0;
      progressBar.value = 0;
      currTimeEl.textContent = '00:00';
      return;
    }
    const idx = (currentIndex - 1 + tracks.length) % tracks.length;
    loadTrack(idx, true);
  }
 
  function playTrackByIndex(idx){
    loadTrack(idx, true);
  }
 
  // ---------- Card click / hover-play-button wiring ----------
  trackEls.forEach((el, idx) => {
    const playOverlay = el.querySelector('.card-play-btn');
 
    el.addEventListener('click', () => {
      if(currentIndex === idx){
        togglePlay();
      } else {
        playTrackByIndex(idx);
      }
    });
 
    playOverlay.addEventListener('click', (e) => {
      e.stopPropagation();
      if(currentIndex === idx){
        togglePlay();
      } else {
        playTrackByIndex(idx);
      }
    });
  });
 
  // ---------- Transport controls ----------
  playBtn.addEventListener('click', togglePlay);
  nextBtn.addEventListener('click', nextTrack);
  prevBtn.addEventListener('click', prevTrack);
 
  shuffleBtn.addEventListener('click', () => {
    shuffle = !shuffle;
    shuffleBtn.classList.toggle('active', shuffle);
    showToast(shuffle ? 'Shuffle on' : 'Shuffle off');
  });
 
  repeatBtn.addEventListener('click', () => {
    repeat = !repeat;
    repeatBtn.classList.toggle('active', repeat);
    showToast(repeat ? 'Repeat one on' : 'Repeat off');
  });
 
  progressBar.addEventListener('input', () => {
    currentSeconds = parseInt(progressBar.value, 10);
    currTimeEl.textContent = formatTime(currentSeconds);
  });
 
  npLike.addEventListener('click', () => {
    if(currentIndex === -1) return;
    const t = tracks[currentIndex];
    t.liked = !t.liked;
    npLike.className = `fa-heart np-like ${t.liked ? 'fa-solid liked' : 'fa-regular'}`;
    showToast(t.liked ? `Added "${t.title}" to Liked Songs` : `Removed "${t.title}" from Liked Songs`);
  });
 
  // ---------- Volume ----------
  let lastVolume = 70;
  volumeBar.addEventListener('input', () => {
    const v = parseInt(volumeBar.value, 10);
    updateVolumeIcon(v);
  });
 
  function updateVolumeIcon(v){
    volIcon.classList.remove('fa-volume-high','fa-volume-low','fa-volume-xmark');
    if(v === 0) volIcon.classList.add('fa-volume-xmark');
    else if(v < 50) volIcon.classList.add('fa-volume-low');
    else volIcon.classList.add('fa-volume-high');
  }
 
  volIcon.addEventListener('click', () => {
    if(parseInt(volumeBar.value, 10) > 0){
      lastVolume = volumeBar.value;
      volumeBar.value = 0;
    } else {
      volumeBar.value = lastVolume || 70;
    }
    updateVolumeIcon(parseInt(volumeBar.value, 10));
  });
 
  // ---------- Queue panel ----------
  queueBtn.addEventListener('click', () => {
    queuePanel.classList.toggle('open');
    queueBtn.classList.toggle('active', queuePanel.classList.contains('open'));
    if(queuePanel.classList.contains('open')) renderQueue();
  });
 
  closeQueue.addEventListener('click', () => {
    queuePanel.classList.remove('open');
    queueBtn.classList.remove('active');
  });
 
  // ---------- Sidebar nav (Home / Search) ----------
  navOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      navOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
 
      if(opt.dataset.view === 'search'){
        searchWrap.classList.add('show');
        searchInput.focus();
      } else {
        searchWrap.classList.remove('show');
        searchInput.value = '';
        filterCards('');
      }
    });
  });
 
  // ---------- Live search filter ----------
  function filterCards(query){
    const q = query.trim().toLowerCase();
    document.querySelectorAll('.card, .artist-card').forEach(el => {
      const title = (el.dataset.title || '').toLowerCase();
      const artist = (el.dataset.artist || '').toLowerCase();
      const match = q === '' || title.includes(q) || artist.includes(q);
      el.style.display = match ? '' : 'none';
    });
  }
 
  searchInput.addEventListener('input', () => filterCards(searchInput.value));
 
  // ---------- Sidebar: create playlist / browse podcasts ----------
  let playlistCount = 0;
  function createPlaylist(){
    playlistCount += 1;
    const li = document.createElement('li');
    li.innerHTML = `<i class="fa-solid fa-music"></i> My Playlist #${playlistCount}`;
    playlistList.appendChild(li);
    showToast(`Created "My Playlist #${playlistCount}"`);
  }
 
  createPlaylistBtn.addEventListener('click', createPlaylist);
  createPlaylistIcon.addEventListener('click', createPlaylist);
 
  browsePodcastBtn.addEventListener('click', () => {
    showToast('Podcast browsing is coming soon');
  });
 
  // ---------- Init ----------
  updateVolumeIcon(parseInt(volumeBar.value, 10));
  renderQueue();
});
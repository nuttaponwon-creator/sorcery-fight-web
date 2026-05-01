// src/core/AudioManager.js

export class AudioManager {
    constructor() {
        if (AudioManager.instance) {
            return AudioManager.instance;
        }
        AudioManager.instance = this;

        this.player = null;
        this.isMuted = false;
        this.isReady = false;
        this.videoId = '44pt8w67S8I'; // Toji Theme
        this.playlist = ['44pt8w67S8I', 'tFj633m0IXg']; // Toji -> SpecialZ
        this.bgmVolume = 30; // Default BGM Volume (0-100)
        this.sfxVolume = 80; // Default SFX Volume (0-100)
        
        // ตารางรวม URL เสียงเอฟเฟกต์ (Royalty Free) สำหรับใช้งานทันที
        this.sfxMap = {
            'punch': './assets/audio/punch.mp3', 
            'teleport': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
            'blue': 'https://assets.mixkit.co/active_storage/sfx/2101/2101-preview.mp3',
            'red': 'https://assets.mixkit.co/active_storage/sfx/2800/2800-preview.mp3',
            'purple_charge': 'https://assets.mixkit.co/active_storage/sfx/2810/2810-preview.mp3',
            'purple_fire': 'https://assets.mixkit.co/active_storage/sfx/2820/2820-preview.mp3',
            'slash': 'https://assets.mixkit.co/active_storage/sfx/1110/1110-preview.mp3',
            'fire_arrow': 'https://assets.mixkit.co/active_storage/sfx/1114/1114-preview.mp3',
            'world_slash': 'https://assets.mixkit.co/active_storage/sfx/1117/1117-preview.mp3',
            'domain': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
            'purple_voice': './assets/audio/purple_voice.mp3',
            'domain_voice': './assets/audio/domain_voice.mp3'
        };

        const initPlayer = () => {
            if (this.player) return;
            if (typeof YT === 'undefined' || !YT.Player) return;

            this.player = new YT.Player('youtube-player', {
                height: '0', width: '0',
                playerVars: { 
                    'autoplay': 0, 
                    'loop': 1, 
                    'playlist': this.playlist.join(','), // ลูปทั้ง Playlist
                    'controls': 0, 
                    'disablekb': 1, 
                    'origin': window.location.origin 
                },
                events: {
                    'onReady': () => { 
                        this.isReady = true; 
                        console.log("✅ YouTube Player Ready with Playlist");
                        const btn = document.getElementById('music-toggle');
                        if (btn && btn.innerText.includes('OFF')) this.isMuted = true;
                        
                        if (window.pendingBGMStart) {
                            this.playBGM();
                            window.pendingBGMStart = false;
                        }
                    },
                    'onStateChange': (event) => {
                        // ถ้าหยุดเล่นหรือจบเพลง ให้วนกลับมาเล่นต่อ (ช่วยเผื่อระบบ Loop ของ YouTube เอ๋อ)
                        if (event.data === YT.PlayerState.ENDED) {
                            this.player.playVideo();
                        }
                    }
                }
            });
        };

        if (window.YT && window.YT.Player) {
            initPlayer();
        } else {
            const oldReady = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                if (oldReady) oldReady();
                initPlayer();
            };
        }
    }

    init() {
        console.log("Audio System Initialized (Singleton)");
    }

    playBGM() {
        console.log("Attempting to play BGM...", { isMuted: this.isMuted, isReady: this.isReady, player: !!this.player });
        if (this.isMuted || !this.isReady || !this.player) return;
        try {
            if (typeof this.player.playVideo === 'function') {
                this.player.playVideo();
                this.player.setVolume(this.bgmVolume);
            }
        } catch (e) {
            console.error("BGM Play Error:", e);
        }
    }

    stopBGM() {
        if (this.player && typeof this.player.stopVideo === 'function') {
            this.player.stopVideo();
        }
    }

    toggleMute() {
        if (!this.player || !this.isReady) return false;
        this.isMuted = !this.isMuted;
        
        try {
            if (this.isMuted) {
                if (typeof this.player.pauseVideo === 'function') this.player.pauseVideo();
            } else {
                if (typeof this.player.playVideo === 'function') this.player.playVideo();
            }
        } catch (e) {
            console.warn("Toggle Mute Error:", e);
        }
        
        return this.isMuted;
    }

    setBGMVolume(value) {
        this.bgmVolume = Math.max(0, Math.min(100, value));
        if (this.player && this.isReady && typeof this.player.setVolume === 'function') {
            this.player.setVolume(this.bgmVolume);
        }
        
        // Update UI if exists
        const display = document.getElementById('bgm-vol-display');
        if (display) display.innerText = `${this.bgmVolume}%`;
        
        return this.bgmVolume;
    }

    setSFXVolume(value) {
        this.sfxVolume = Math.max(0, Math.min(100, value));
        
        // Update UI if exists
        const display = document.getElementById('sfx-vol-display');
        if (display) display.innerText = `${this.sfxVolume}%`;
        
        return this.sfxVolume;
    }

    playSFX(name) {
        if (this.isMuted) return;
        const url = this.sfxMap[name] || `./assets/sounds/${name}.mp3`;
        const sfx = new Audio(url);
        sfx.volume = (this.sfxVolume / 100); // Apply separated SFX volume
        sfx.play().catch(e => {
            if (e.name !== 'NotAllowedError') {
                console.warn(`SFX '${name}' failed to play from ${url}`);
            }
        });
    }
}

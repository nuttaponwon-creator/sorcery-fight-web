// src/core/AudioManager.js

export class AudioManager {
    constructor() {
        this.player = null;
        this.isMuted = false;
        this.isReady = false;
        this.videoId = 'tFj633m0IXg'; // ID จากลิงก์ที่คุณส่งมา
        
        // ผูกฟังก์ชัน callback กับตัวแปรแวดล้อม
        window.onYouTubeIframeAPIReady = () => {
            this.player = new YT.Player('youtube-player', {
                height: '0',
                width: '0',
                videoId: this.videoId,
                playerVars: {
                    'autoplay': 0,
                    'loop': 1,
                    'playlist': this.videoId
                },
                events: {
                    'onReady': () => { 
                        this.isReady = true; 
                        console.log("YouTube Player Ready");
                    }
                }
            });
        };
    }

    init() {
        // YouTube API ถูกโหลดใน index.html แล้ว
        console.log("Audio System Initialized (YouTube Mode)");
    }

    playBGM() {
        if (this.isMuted || !this.isReady) return;
        this.player.playVideo();
        this.player.setVolume(40); // ความดัง 40%
    }

    stopBGM() {
        if (this.player) this.player.stopVideo();
    }

    toggleMute() {
        if (!this.player) return false;
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.player.pauseVideo();
        } else {
            this.player.playVideo();
        }
        return this.isMuted;
    }
}

export const audioManager = new AudioManager();

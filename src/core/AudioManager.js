// src/core/AudioManager.js

export class AudioManager {
    constructor() {
        this.bgm = new Audio();
        this.bgm.loop = true;
        this.bgm.volume = 0.4; // ความดัง 40%
        
        this.isMuted = false;
        this.hasStarted = false;
    }

    init(filePath) {
        this.bgm.src = filePath;
        console.log("Audio initialized with:", filePath);
    }

    playBGM() {
        if (this.isMuted) return;
        
        // เบราว์เซอร์ส่วนใหญ่จะไม่อนุญาตให้เล่นเพลงจนกว่าผู้เล่นจะกดคลิกอะไรบางอย่าง
        this.bgm.play().then(() => {
            this.hasStarted = true;
        }).catch(err => {
            console.log("Audio play deferred: Waiting for user interaction.");
        });
    }

    stopBGM() {
        this.bgm.pause();
        this.bgm.currentTime = 0;
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.bgm.pause();
        } else {
            this.bgm.play();
        }
        return this.isMuted;
    }
}

export const audioManager = new AudioManager();

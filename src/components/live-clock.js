AFRAME.registerComponent("live-clock", {
    init: function () {
        const el = this.el;
        function updateTime() {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-GB', {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
            });
            // 🔽 This is the key log line to verify updates
            // console.log("⏰ Clock time:", timeStr);

            // el.setAttribute("text", "value", timeStr);

            el.setAttribute("text", "value", timeStr);
        }


        this.clockInterval = setInterval(updateTime, 1000);
        updateTime(); // Run immediately on init
    },
    remove: function () {
        clearInterval(this.clockInterval);
    }
});
 

// Main application initialization and animation loop

class App {
    constructor() {
        this.canvas = document.getElementById('stellarCanvas');
        this.network = new Network(this.canvas);
        this.renderer = new Renderer(this.canvas);
        this.controls = new Controls(this.network);
        this.statistics = new Statistics(this.network);

        this.isRunning = false;
        this.animationFrameId = null;
    }

    initialize() {
        // Initialize network with default node count
        this.network.initialize(this.network.params.nodeCount);

        // Start animation loop
        this.start();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    handleResize() {
        // Renderer already handles canvas resize
        // Adjust node positions if they're outside new bounds
        for (let node of this.network.nodes) {
            node.x = Math.min(node.x, this.canvas.width);
            node.y = Math.min(node.y, this.canvas.height);
        }
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    animate(currentTime = 0) {
        if (!this.isRunning) return;

        // Update network
        this.network.update();

        // Render
        this.renderer.render(this.network);

        // Update statistics
        this.statistics.update(currentTime);

        // Continue animation loop
        this.animationFrameId = requestAnimationFrame((time) => this.animate(time));
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.initialize();
});

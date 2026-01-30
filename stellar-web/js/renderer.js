class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.setupCanvas();

        // Bind resize handler
        window.addEventListener('resize', () => this.setupCanvas());
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawEdges(edges, thickness) {
        this.ctx.strokeStyle = 'rgba(77, 208, 225, 0.4)';
        this.ctx.lineWidth = thickness;

        for (let edge of edges) {
            // Optional: fade based on distance
            const maxRadius = 500;
            const opacity = 0.6 - (edge.distance / maxRadius) * 0.4;
            this.ctx.strokeStyle = `rgba(77, 208, 225, ${Math.max(0.2, opacity)})`;

            this.ctx.beginPath();
            this.ctx.moveTo(edge.from.x, edge.from.y);
            this.ctx.lineTo(edge.to.x, edge.to.y);
            this.ctx.stroke();
        }
    }

    drawNodes(nodes, size) {
        for (let node of nodes) {
            // Outer glow
            const gradient = this.ctx.createRadialGradient(
                node.x, node.y, 0,
                node.x, node.y, size * 3
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            gradient.addColorStop(0.2, 'rgba(128, 222, 234, 0.6)');
            gradient.addColorStop(0.5, 'rgba(77, 208, 225, 0.3)');
            gradient.addColorStop(1, 'rgba(77, 208, 225, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, size * 3, 0, Math.PI * 2);
            this.ctx.fill();

            // Core node
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
            this.ctx.fill();

            // Inner bright spot
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(node.x - size * 0.3, node.y - size * 0.3, size * 0.4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    render(network) {
        this.clear();

        // Draw edges first (behind nodes)
        this.drawEdges(network.edges, network.params.edgeThickness);

        // Draw nodes on top
        this.drawNodes(network.nodes, network.params.nodeSize);
    }
}

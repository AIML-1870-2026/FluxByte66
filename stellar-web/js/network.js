class Node {
    constructor(x, y, canvas) {
        this.x = x;
        this.y = y;
        this.canvas = canvas;

        // Random velocity
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 0.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }

    update(speedMultiplier) {
        // Update position with speed multiplier
        this.x += this.vx * speedMultiplier;
        this.y += this.vy * speedMultiplier;

        // Bounce off edges
        if (this.x <= 0 || this.x >= this.canvas.width) {
            this.vx *= -1;
            this.x = Math.max(0, Math.min(this.canvas.width, this.x));
        }
        if (this.y <= 0 || this.y >= this.canvas.height) {
            this.vy *= -1;
            this.y = Math.max(0, Math.min(this.canvas.height, this.y));
        }
    }

    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

class Network {
    constructor(canvas) {
        this.canvas = canvas;
        this.nodes = [];
        this.edges = [];

        // Parameters
        this.params = {
            nodeCount: 50,
            nodeSpeed: 1.0,
            connectivityRadius: 150,
            nodeSize: 6,
            edgeThickness: 1.5
        };
    }

    initialize(nodeCount) {
        this.nodes = [];
        for (let i = 0; i < nodeCount; i++) {
            this.addNode();
        }
    }

    addNode() {
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;
        const node = new Node(x, y, this.canvas);
        this.nodes.push(node);
    }

    removeNode() {
        if (this.nodes.length > 0) {
            this.nodes.pop();
        }
    }

    setNodeCount(count) {
        const currentCount = this.nodes.length;
        const diff = count - currentCount;

        if (diff > 0) {
            for (let i = 0; i < diff; i++) {
                this.addNode();
            }
        } else if (diff < 0) {
            for (let i = 0; i < -diff; i++) {
                this.removeNode();
            }
        }

        this.params.nodeCount = count;
    }

    update() {
        // Update all nodes
        for (let node of this.nodes) {
            node.update(this.params.nodeSpeed);
        }

        // Calculate edges based on connectivity radius
        this.calculateEdges();
    }

    calculateEdges() {
        this.edges = [];
        const radius = this.params.connectivityRadius;

        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const distance = this.nodes[i].distanceTo(this.nodes[j]);
                if (distance <= radius) {
                    this.edges.push({
                        from: this.nodes[i],
                        to: this.nodes[j],
                        distance: distance
                    });
                }
            }
        }
    }

    setParameter(param, value) {
        if (param === 'nodeCount') {
            this.setNodeCount(value);
        } else {
            this.params[param] = value;
        }
    }

    getEdgeCount() {
        return this.edges.length;
    }

    getNodeCount() {
        return this.nodes.length;
    }

    getAverageConnections() {
        if (this.nodes.length === 0) return 0;
        return (this.edges.length * 2) / this.nodes.length;
    }

    getNetworkDensity() {
        const n = this.nodes.length;
        if (n <= 1) return 0;
        const maxPossibleEdges = (n * (n - 1)) / 2;
        return (this.edges.length / maxPossibleEdges) * 100;
    }
}

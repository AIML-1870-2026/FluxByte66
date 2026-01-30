class Statistics {
    constructor(network) {
        this.network = network;
        this.elements = {
            nodes: document.getElementById('statNodes'),
            edges: document.getElementById('statEdges'),
            avgConnections: document.getElementById('statAvgConnections'),
            density: document.getElementById('statDensity')
        };

        this.lastUpdateTime = 0;
        this.updateInterval = 1000 / 30; // 30 fps for stats updates
    }

    update(currentTime) {
        // Throttle updates to reduce overhead
        if (currentTime - this.lastUpdateTime < this.updateInterval) {
            return;
        }
        this.lastUpdateTime = currentTime;

        // Update all statistics
        this.updateNodeCount();
        this.updateEdgeCount();
        this.updateAverageConnections();
        this.updateNetworkDensity();
    }

    updateNodeCount() {
        this.elements.nodes.textContent = this.network.getNodeCount();
    }

    updateEdgeCount() {
        this.elements.edges.textContent = this.network.getEdgeCount();
    }

    updateAverageConnections() {
        const avgConnections = this.network.getAverageConnections();
        this.elements.avgConnections.textContent = avgConnections.toFixed(2);
    }

    updateNetworkDensity() {
        const density = this.network.getNetworkDensity();
        this.elements.density.textContent = density.toFixed(2) + '%';
    }
}

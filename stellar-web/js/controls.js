class Controls {
    constructor(network) {
        this.network = network;
        this.defaults = {
            nodeSpeed: 1.0,
            connectivityRadius: 150,
            nodeCount: 50,
            nodeSize: 6,
            edgeThickness: 1.5
        };

        this.setupControls();
    }

    setupControls() {
        // Node Speed
        const nodeSpeedSlider = document.getElementById('nodeSpeed');
        const nodeSpeedValue = document.getElementById('nodeSpeedValue');
        nodeSpeedSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            nodeSpeedValue.textContent = value.toFixed(1) + 'x';
            this.network.setParameter('nodeSpeed', value);
        });

        // Connectivity Radius
        const connectivityRadiusSlider = document.getElementById('connectivityRadius');
        const connectivityRadiusValue = document.getElementById('connectivityRadiusValue');
        connectivityRadiusSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            connectivityRadiusValue.textContent = value + 'px';
            this.network.setParameter('connectivityRadius', value);
        });

        // Node Count
        const nodeCountSlider = document.getElementById('nodeCount');
        const nodeCountValue = document.getElementById('nodeCountValue');
        nodeCountSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            nodeCountValue.textContent = value;
            this.network.setParameter('nodeCount', value);
        });

        // Node Size
        const nodeSizeSlider = document.getElementById('nodeSize');
        const nodeSizeValue = document.getElementById('nodeSizeValue');
        nodeSizeSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            nodeSizeValue.textContent = value + 'px';
            this.network.setParameter('nodeSize', value);
        });

        // Edge Thickness
        const edgeThicknessSlider = document.getElementById('edgeThickness');
        const edgeThicknessValue = document.getElementById('edgeThicknessValue');
        edgeThicknessSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            edgeThicknessValue.textContent = value + 'px';
            this.network.setParameter('edgeThickness', value);
        });

        // Reset Button
        const resetBtn = document.getElementById('resetBtn');
        resetBtn.addEventListener('click', () => {
            this.resetToDefaults();
        });
    }

    resetToDefaults() {
        // Reset sliders to default values
        document.getElementById('nodeSpeed').value = this.defaults.nodeSpeed;
        document.getElementById('nodeSpeedValue').textContent = this.defaults.nodeSpeed.toFixed(1) + 'x';
        this.network.setParameter('nodeSpeed', this.defaults.nodeSpeed);

        document.getElementById('connectivityRadius').value = this.defaults.connectivityRadius;
        document.getElementById('connectivityRadiusValue').textContent = this.defaults.connectivityRadius + 'px';
        this.network.setParameter('connectivityRadius', this.defaults.connectivityRadius);

        document.getElementById('nodeCount').value = this.defaults.nodeCount;
        document.getElementById('nodeCountValue').textContent = this.defaults.nodeCount;
        this.network.setParameter('nodeCount', this.defaults.nodeCount);

        document.getElementById('nodeSize').value = this.defaults.nodeSize;
        document.getElementById('nodeSizeValue').textContent = this.defaults.nodeSize + 'px';
        this.network.setParameter('nodeSize', this.defaults.nodeSize);

        document.getElementById('edgeThickness').value = this.defaults.edgeThickness;
        document.getElementById('edgeThicknessValue').textContent = this.defaults.edgeThickness + 'px';
        this.network.setParameter('edgeThickness', this.defaults.edgeThickness);
    }
}

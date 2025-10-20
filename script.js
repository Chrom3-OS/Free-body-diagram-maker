// Free Body Diagram Maker
// Main application logic

class FBDApp {
    constructor() {
        this.canvas = document.getElementById('diagramCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.objects = [];
        this.forces = [];
        this.selectedElement = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.gridSize = 20;
        this.showGrid = true;
        this.snapToGrid = true;
        this.showAngles = false;
        this.nextForceId = 1;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.drawGrid();
        this.render();
    }

    setupEventListeners() {
        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Toolbar buttons
        document.getElementById('addBox').addEventListener('click', () => this.addObject('box'));
        document.getElementById('addCircle').addEventListener('click', () => this.addObject('circle'));
        
        document.getElementById('addGravity').addEventListener('click', () => this.setForceMode('gravity'));
        document.getElementById('addNormal').addEventListener('click', () => this.setForceMode('normal'));
        document.getElementById('addFriction').addEventListener('click', () => this.setForceMode('friction'));
        document.getElementById('addTension').addEventListener('click', () => this.setForceMode('tension'));
        document.getElementById('addApplied').addEventListener('click', () => this.setForceMode('applied'));
        document.getElementById('addCustom').addEventListener('click', () => this.setForceMode('custom'));

        document.getElementById('deleteSelected').addEventListener('click', () => this.deleteSelected());
        document.getElementById('clearAll').addEventListener('click', () => this.clearAll());
        document.getElementById('exportImage').addEventListener('click', () => this.exportImage());

        // View options
        document.getElementById('showGrid').addEventListener('change', (e) => {
            this.showGrid = e.target.checked;
            this.render();
        });
        document.getElementById('snapToGrid').addEventListener('change', (e) => {
            this.snapToGrid = e.target.checked;
        });
        document.getElementById('showAngles').addEventListener('change', (e) => {
            this.showAngles = e.target.checked;
            this.render();
        });
    }

    setForceMode(type) {
        this.forceMode = type;
        document.getElementById('canvasInfo').textContent = `Click on an object to add ${type} force`;
    }

    addObject(type) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const obj = {
            id: Date.now(),
            type: type,
            x: centerX,
            y: centerY,
            width: type === 'box' ? 60 : 50,
            height: type === 'box' ? 60 : 50,
            color: '#3498db',
            forces: []
        };
        
        this.objects.push(obj);
        this.selectedElement = obj;
        this.render();
        this.updatePropertiesPanel();
        document.getElementById('canvasInfo').textContent = 'Object added. Click to select and drag to move.';
    }

    addForce(object, type) {
        const forceConfigs = {
            gravity: { angle: 270, magnitude: 50, color: '#e74c3c', label: 'Fg' },
            normal: { angle: 90, magnitude: 50, color: '#2ecc71', label: 'FN' },
            friction: { angle: 180, magnitude: 40, color: '#f39c12', label: 'Ff' },
            tension: { angle: 45, magnitude: 50, color: '#9b59b6', label: 'FT' },
            applied: { angle: 0, magnitude: 50, color: '#1abc9c', label: 'FA' },
            custom: { angle: 0, magnitude: 50, color: '#34495e', label: 'F' }
        };

        const config = forceConfigs[type] || forceConfigs.custom;
        
        const force = {
            id: `force_${this.nextForceId++}`,
            objectId: object.id,
            type: type,
            angle: config.angle,
            magnitude: config.magnitude,
            color: config.color,
            label: config.label + this.nextForceId,
            arrowStyle: 'filled',
            lineWidth: 3
        };

        this.forces.push(force);
        object.forces.push(force.id);
        this.selectedElement = force;
        this.forceMode = null;
        this.render();
        this.updatePropertiesPanel();
        document.getElementById('canvasInfo').textContent = `${type} force added. Select to edit properties.`;
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // If in force mode, add force to clicked object
        if (this.forceMode) {
            const clickedObject = this.getObjectAt(x, y);
            if (clickedObject) {
                this.addForce(clickedObject, this.forceMode);
            }
            return;
        }

        // Check if clicking on a force arrow
        const clickedForce = this.getForceAt(x, y);
        if (clickedForce) {
            this.selectedElement = clickedForce;
            this.isDragging = true;
            this.updatePropertiesPanel();
            this.render();
            return;
        }

        // Check if clicking on an object
        const clickedObject = this.getObjectAt(x, y);
        if (clickedObject) {
            this.selectedElement = clickedObject;
            this.isDragging = true;
            this.dragOffset = {
                x: x - clickedObject.x,
                y: y - clickedObject.y
            };
            this.updatePropertiesPanel();
            this.render();
            return;
        }

        // Click on empty space - deselect
        this.selectedElement = null;
        this.updatePropertiesPanel();
        this.render();
    }

    handleMouseMove(e) {
        if (!this.isDragging || !this.selectedElement) return;

        const rect = this.canvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        if (this.selectedElement.type === 'box' || this.selectedElement.type === 'circle') {
            // Moving an object
            x -= this.dragOffset.x;
            y -= this.dragOffset.y;

            if (this.snapToGrid) {
                x = Math.round(x / this.gridSize) * this.gridSize;
                y = Math.round(y / this.gridSize) * this.gridSize;
            }

            this.selectedElement.x = Math.max(50, Math.min(this.canvas.width - 50, x));
            this.selectedElement.y = Math.max(50, Math.min(this.canvas.height - 50, y));
        }

        this.render();
    }

    handleMouseUp(e) {
        this.isDragging = false;
    }

    getObjectAt(x, y) {
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            if (obj.type === 'box') {
                if (x >= obj.x - obj.width / 2 && x <= obj.x + obj.width / 2 &&
                    y >= obj.y - obj.height / 2 && y <= obj.y + obj.height / 2) {
                    return obj;
                }
            } else if (obj.type === 'circle') {
                const dx = x - obj.x;
                const dy = y - obj.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= obj.width / 2) {
                    return obj;
                }
            }
        }
        return null;
    }

    getForceAt(x, y) {
        for (let i = this.forces.length - 1; i >= 0; i--) {
            const force = this.forces[i];
            const obj = this.objects.find(o => o.id === force.objectId);
            if (!obj) continue;

            const angleRad = (force.angle * Math.PI) / 180;
            const endX = obj.x + Math.cos(angleRad) * force.magnitude;
            const endY = obj.y - Math.sin(angleRad) * force.magnitude;

            // Check if click is near the force arrow line
            const distance = this.distanceToLine(x, y, obj.x, obj.y, endX, endY);
            if (distance < 10) {
                return force;
            }
        }
        return null;
    }

    distanceToLine(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    drawGrid() {
        if (!this.showGrid) return;

        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawObject(obj) {
        this.ctx.fillStyle = obj.color;
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;

        if (obj.type === 'box') {
            this.ctx.fillRect(obj.x - obj.width / 2, obj.y - obj.height / 2, obj.width, obj.height);
            this.ctx.strokeRect(obj.x - obj.width / 2, obj.y - obj.height / 2, obj.width, obj.height);
        } else if (obj.type === 'circle') {
            this.ctx.beginPath();
            this.ctx.arc(obj.x, obj.y, obj.width / 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }

        // Draw selection indicator
        if (this.selectedElement === obj) {
            this.ctx.strokeStyle = '#667eea';
            this.ctx.lineWidth = 3;
            if (obj.type === 'box') {
                this.ctx.strokeRect(obj.x - obj.width / 2 - 5, obj.y - obj.height / 2 - 5, 
                                   obj.width + 10, obj.height + 10);
            } else {
                this.ctx.beginPath();
                this.ctx.arc(obj.x, obj.y, obj.width / 2 + 5, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
    }

    drawForce(force) {
        const obj = this.objects.find(o => o.id === force.objectId);
        if (!obj) return;

        const angleRad = (force.angle * Math.PI) / 180;
        const endX = obj.x + Math.cos(angleRad) * force.magnitude;
        const endY = obj.y - Math.sin(angleRad) * force.magnitude;

        // Draw arrow line
        this.ctx.strokeStyle = force.color;
        this.ctx.fillStyle = force.color;
        this.ctx.lineWidth = force.lineWidth;
        this.ctx.lineCap = 'round';

        this.ctx.beginPath();
        this.ctx.moveTo(obj.x, obj.y);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();

        // Draw arrowhead
        const arrowSize = 12;
        const arrowAngle = Math.PI / 6;

        this.ctx.beginPath();
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(
            endX - arrowSize * Math.cos(angleRad - arrowAngle),
            endY + arrowSize * Math.sin(angleRad - arrowAngle)
        );
        this.ctx.lineTo(
            endX - arrowSize * Math.cos(angleRad + arrowAngle),
            endY + arrowSize * Math.sin(angleRad + arrowAngle)
        );
        this.ctx.closePath();
        
        if (force.arrowStyle === 'filled') {
            this.ctx.fill();
        } else {
            this.ctx.stroke();
        }

        // Draw label
        const labelX = obj.x + Math.cos(angleRad) * (force.magnitude / 2);
        const labelY = obj.y - Math.sin(angleRad) * (force.magnitude / 2);
        
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Draw label background
        const metrics = this.ctx.measureText(force.label);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillRect(labelX - metrics.width / 2 - 4, labelY - 10, metrics.width + 8, 20);
        
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(force.label, labelX, labelY);

        // Show angle if enabled
        if (this.showAngles) {
            const angleText = `${force.angle}°`;
            this.ctx.font = '12px Arial';
            this.ctx.fillStyle = '#666';
            this.ctx.fillText(angleText, obj.x + 20, obj.y - 20);
        }

        // Draw selection indicator
        if (this.selectedElement === force) {
            this.ctx.strokeStyle = '#667eea';
            this.ctx.lineWidth = 5;
            this.ctx.globalAlpha = 0.3;
            this.ctx.beginPath();
            this.ctx.moveTo(obj.x, obj.y);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
        }
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        if (this.showGrid) {
            this.drawGrid();
        }

        // Draw objects
        for (const obj of this.objects) {
            this.drawObject(obj);
        }

        // Draw forces
        for (const force of this.forces) {
            this.drawForce(force);
        }
    }

    updatePropertiesPanel() {
        const panel = document.getElementById('propertiesContent');
        
        if (!this.selectedElement) {
            panel.innerHTML = '<p class="no-selection">Select an element to edit its properties</p>';
            return;
        }

        if (this.selectedElement.type === 'box' || this.selectedElement.type === 'circle') {
            // Object properties
            const obj = this.selectedElement;
            panel.innerHTML = `
                <div class="property-group">
                    <label>Object Type</label>
                    <input type="text" value="${obj.type}" disabled>
                </div>
                <div class="property-group">
                    <label>Color</label>
                    <input type="color" id="objColor" value="${obj.color}">
                </div>
                <div class="property-row">
                    <div class="property-group">
                        <label>Width/Radius</label>
                        <input type="number" id="objWidth" value="${obj.width}" min="20" max="200">
                    </div>
                    ${obj.type === 'box' ? `
                    <div class="property-group">
                        <label>Height</label>
                        <input type="number" id="objHeight" value="${obj.height}" min="20" max="200">
                    </div>
                    ` : ''}
                </div>
                <div class="property-row">
                    <div class="property-group">
                        <label>X Position</label>
                        <input type="number" id="objX" value="${Math.round(obj.x)}">
                    </div>
                    <div class="property-group">
                        <label>Y Position</label>
                        <input type="number" id="objY" value="${Math.round(obj.y)}">
                    </div>
                </div>
            `;

            document.getElementById('objColor').addEventListener('input', (e) => {
                obj.color = e.target.value;
                this.render();
            });
            document.getElementById('objWidth').addEventListener('input', (e) => {
                obj.width = parseInt(e.target.value);
                if (obj.type === 'circle') obj.height = obj.width;
                this.render();
            });
            if (obj.type === 'box') {
                document.getElementById('objHeight').addEventListener('input', (e) => {
                    obj.height = parseInt(e.target.value);
                    this.render();
                });
            }
            document.getElementById('objX').addEventListener('input', (e) => {
                obj.x = parseInt(e.target.value);
                this.render();
            });
            document.getElementById('objY').addEventListener('input', (e) => {
                obj.y = parseInt(e.target.value);
                this.render();
            });

        } else {
            // Force properties
            const force = this.selectedElement;
            panel.innerHTML = `
                <div class="property-group">
                    <label>Force Type</label>
                    <input type="text" value="${force.type}" disabled>
                </div>
                <div class="property-group">
                    <label>Label</label>
                    <input type="text" id="forceLabel" value="${force.label}">
                </div>
                <div class="property-group">
                    <label>Color</label>
                    <input type="color" id="forceColor" value="${force.color}">
                </div>
                <div class="property-group">
                    <label>Magnitude (length)</label>
                    <input type="number" id="forceMagnitude" value="${force.magnitude}" min="10" max="300">
                </div>
                <div class="property-group">
                    <label>Angle (degrees)</label>
                    <input type="number" id="forceAngle" value="${force.angle}" min="0" max="360">
                </div>
                <div class="property-group">
                    <label>Line Width</label>
                    <input type="number" id="forceLineWidth" value="${force.lineWidth}" min="1" max="10">
                </div>
                <div class="property-group">
                    <label>Arrow Style</label>
                    <select id="forceArrowStyle">
                        <option value="filled" ${force.arrowStyle === 'filled' ? 'selected' : ''}>Filled</option>
                        <option value="outline" ${force.arrowStyle === 'outline' ? 'selected' : ''}>Outline</option>
                    </select>
                </div>
            `;

            document.getElementById('forceLabel').addEventListener('input', (e) => {
                force.label = e.target.value;
                this.render();
            });
            document.getElementById('forceColor').addEventListener('input', (e) => {
                force.color = e.target.value;
                this.render();
            });
            document.getElementById('forceMagnitude').addEventListener('input', (e) => {
                force.magnitude = parseInt(e.target.value);
                this.render();
            });
            document.getElementById('forceAngle').addEventListener('input', (e) => {
                force.angle = parseInt(e.target.value) % 360;
                this.render();
            });
            document.getElementById('forceLineWidth').addEventListener('input', (e) => {
                force.lineWidth = parseInt(e.target.value);
                this.render();
            });
            document.getElementById('forceArrowStyle').addEventListener('change', (e) => {
                force.arrowStyle = e.target.value;
                this.render();
            });
        }
    }

    deleteSelected() {
        if (!this.selectedElement) {
            alert('Please select an element to delete');
            return;
        }

        if (this.selectedElement.type === 'box' || this.selectedElement.type === 'circle') {
            // Delete object and its forces
            const objId = this.selectedElement.id;
            this.objects = this.objects.filter(o => o.id !== objId);
            this.forces = this.forces.filter(f => f.objectId !== objId);
        } else {
            // Delete force
            const forceId = this.selectedElement.id;
            this.forces = this.forces.filter(f => f.id !== forceId);
            
            // Remove force reference from object
            for (const obj of this.objects) {
                obj.forces = obj.forces.filter(fid => fid !== forceId);
            }
        }

        this.selectedElement = null;
        this.updatePropertiesPanel();
        this.render();
        document.getElementById('canvasInfo').textContent = 'Element deleted';
    }

    clearAll() {
        if (confirm('Are you sure you want to clear the entire diagram?')) {
            this.objects = [];
            this.forces = [];
            this.selectedElement = null;
            this.nextForceId = 1;
            this.updatePropertiesPanel();
            this.render();
            document.getElementById('canvasInfo').textContent = 'Diagram cleared';
        }
    }

    exportImage() {
        // Temporarily hide grid for export
        const wasShowingGrid = this.showGrid;
        this.showGrid = false;
        this.render();

        // Export canvas as PNG
        const link = document.createElement('a');
        link.download = 'free-body-diagram.png';
        link.href = this.canvas.toDataURL('image/png');
        link.click();

        // Restore grid setting
        this.showGrid = wasShowingGrid;
        this.render();
        
        document.getElementById('canvasInfo').textContent = 'Diagram exported as PNG';
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new FBDApp();
});

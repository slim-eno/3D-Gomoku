class ThreeDimensionalGomoku {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.board = null;
        this.pieces = [];
        this.currentPlayer = 'black';
        this.gameMode = 'human';
        this.boardSize = 7;
        this.boardSkin = 'wood';
        this.pieceSkin = 'classic';
        this.gameOver = false;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isRotating = false;
        this.isPanning = false;
        this.lastMousePosition = { x: 0, y: 0 };
        this.cameraTarget = new THREE.Vector3(0, 0, 0);
        this.cameraDistance = 20;
        
        // 三维方向向量，用于胜负判断
        this.directions = [
            // 同一平面内的方向
            [1, 0, 0], [-1, 0, 0], // x轴方向
            [0, 1, 0], [0, -1, 0], // y轴方向
            [0, 0, 1], [0, 0, -1], // z轴方向
            
            // 对角线方向
            [1, 1, 0], [-1, -1, 0], [1, -1, 0], [-1, 1, 0], // xy平面对角线
            [1, 0, 1], [-1, 0, -1], [1, 0, -1], [-1, 0, 1], // xz平面对角线
            [0, 1, 1], [0, -1, -1], [0, 1, -1], [0, -1, 1], // yz平面对角线
            
            // 三维对角线方向
            [1, 1, 1], [-1, -1, -1], [1, 1, -1], [-1, -1, 1],
            [1, -1, 1], [-1, 1, -1], [1, -1, -1], [-1, 1, 1]
        ];
        
        this.init();
        this.setupEventListeners();
        this.animate();
    }
    
    init() {
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
        
        // 创建相机
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(15, 15, 15);
        this.camera.lookAt(this.cameraTarget);
        
        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('canvas'), 
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // 添加光源
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);
        
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(-10, -10, -10);
        this.scene.add(pointLight);
        
        // 初始化射线投射器，提高精度
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 1000;
        
        // 初始化棋盘
        this.initBoard();
    }
    
    initBoard() {
        // 清除现有棋盘和棋子
        if (this.board) {
            this.scene.remove(this.board);
        }
        this.pieces.forEach(piece => this.scene.remove(piece));
        this.pieces = [];
        
        // 创建棋盘数据结构
        this.board = new THREE.Group();
        this.boardData = Array(this.boardSize).fill().map(() => 
            Array(this.boardSize).fill().map(() => 
                Array(this.boardSize).fill(null)
            )
        );
        
        // 创建棋盘格子
        const gridSize = 2;
        const offset = (this.boardSize - 1) * gridSize / 2;
        
        for (let x = 0; x < this.boardSize; x++) {
            for (let y = 0; y < this.boardSize; y++) {
                for (let z = 0; z < this.boardSize; z++) {
                    // 创建格子主体（增大尺寸以提高点击检测灵敏度）
                    const geometry = new THREE.BoxGeometry(gridSize, gridSize, gridSize);
                    const material = this.getBoardMaterial();
                    const cube = new THREE.Mesh(geometry, material);
                    cube.position.set(
                        x * gridSize - offset,
                        y * gridSize - offset,
                        z * gridSize - offset
                    );
                    cube.userData = { x, y, z, type: 'grid' };
                    cube.renderOrder = 0;
                    this.board.add(cube);
                    
                    // 添加格子边框，增强可见性
                    const edges = new THREE.EdgesGeometry(geometry);
                    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
                    const wireframe = new THREE.LineSegments(edges, edgeMaterial);
                    wireframe.position.copy(cube.position);
                    wireframe.renderOrder = 0;
                    this.board.add(wireframe);
                }
            }
        }
        
        this.scene.add(this.board);
    }
    
    getBoardMaterial() {
        const materials = {
            wood: new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8, metalness: 0.2, transparent: true, opacity: 0.2 }),
            marble: new THREE.MeshStandardMaterial({ color: 0xF5F5DC, roughness: 0.6, metalness: 0.3, transparent: true, opacity: 0.2 }),
            metal: new THREE.MeshStandardMaterial({ color: 0xC0C0C0, roughness: 0.4, metalness: 0.8, transparent: true, opacity: 0.2 })
        };
        return materials[this.boardSkin] || materials.wood;
    }
    
    getPieceMaterial(color) {
        const baseColor = color === 'black' ? 0x000000 : 0xffffff;
        
        const materials = {
            classic: new THREE.MeshStandardMaterial({ 
                color: baseColor, 
                roughness: 0.7, 
                metalness: 0.3 
            }),
            glossy: new THREE.MeshStandardMaterial({ 
                color: baseColor, 
                roughness: 0.3, 
                metalness: 0.8 
            }),
            crystal: new THREE.MeshStandardMaterial({ 
                color: baseColor, 
                roughness: 0.1, 
                metalness: 0.1, 
                transparent: true, 
                opacity: 0.9 
            })
        };
        return materials[this.pieceSkin] || materials.classic;
    }
    
    setupEventListeners() {
        // 鼠标事件
        const canvas = this.renderer.domElement;
        
        canvas.addEventListener('mousedown', (event) => this.onMouseDown(event));
        canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
        canvas.addEventListener('mouseup', () => this.onMouseUp());
        canvas.addEventListener('wheel', (event) => this.onMouseWheel(event));
        
        // 窗口大小调整
        window.addEventListener('resize', () => this.onWindowResize());
        
        // UI事件
        document.getElementById('game-mode').addEventListener('change', (e) => {
            this.gameMode = e.target.value;
        });
        
        document.getElementById('board-size').addEventListener('change', (e) => {
            this.boardSize = parseInt(e.target.value);
            this.newGame();
        });
        
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.newGame();
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.newGame();
            document.getElementById('winner-message').style.display = 'none';
        });
        
        // 皮肤选择
        document.querySelectorAll('#board-skins .skin-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('#board-skins .skin-option').forEach(opt => opt.classList.remove('selected'));
                e.target.classList.add('selected');
                this.boardSkin = e.target.dataset.skin;
                this.initBoard();
            });
        });
        
        document.querySelectorAll('#piece-skins .skin-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('#piece-skins .skin-option').forEach(opt => opt.classList.remove('selected'));
                e.target.classList.add('selected');
                this.pieceSkin = e.target.dataset.skin;
            });
        });
    }
    
    onMouseDown(event) {
        // 阻止右键菜单
        if (event.button === 2) {
            event.preventDefault();
        }
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.lastMousePosition = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        
        if (event.button === 0) { // 左键
            this.handleClick(event);
        } else if (event.button === 1) { // 中键
            this.isPanning = true;
        } else if (event.button === 2) { // 右键
            this.isRotating = true;
        }
    }
    
    onMouseMove(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const currentX = event.clientX - rect.left;
        const currentY = event.clientY - rect.top;
        
        const deltaX = currentX - this.lastMousePosition.x;
        const deltaY = currentY - this.lastMousePosition.y;
        
        if (this.isRotating) {
            this.rotateCamera(deltaX, deltaY);
        } else if (this.isPanning) {
            this.panCamera(deltaX, deltaY);
        }
        
        this.lastMousePosition = { x: currentX, y: currentY };
    }
    
    onMouseUp() {
        this.isRotating = false;
        this.isPanning = false;
    }
    
    onMouseWheel(event) {
        this.zoomCamera(event.deltaY);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    rotateCamera(deltaX, deltaY) {
        const sensitivity = 0.02;
        
        // 获取相机到目标点的向量
        const cameraPosition = this.camera.position.clone();
        const targetPosition = this.cameraTarget.clone();
        
        // 计算相机到目标点的方向和距离
        const direction = new THREE.Vector3().subVectors(cameraPosition, targetPosition).normalize();
        const distance = cameraPosition.distanceTo(targetPosition);
        
        // 计算旋转轴
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(direction, up).normalize();
        
        // 绕上下轴旋转（左右旋转）
        const rotationY = new THREE.Quaternion().setFromAxisAngle(up, deltaX * sensitivity);
        // 绕左右轴旋转（上下旋转）
        const rotationX = new THREE.Quaternion().setFromAxisAngle(right, deltaY * sensitivity);
        
        // 应用旋转
        direction.applyQuaternion(rotationY);
        direction.applyQuaternion(rotationX);
        
        // 计算新的相机位置
        const newPosition = new THREE.Vector3().addVectors(
            targetPosition,
            direction.multiplyScalar(distance)
        );
        
        // 更新相机位置和朝向
        this.camera.position.copy(newPosition);
        this.camera.lookAt(targetPosition);
    }
    
    panCamera(deltaX, deltaY) {
        const panSpeed = 0.05;
        const panDirection = new THREE.Vector3(-deltaX, deltaY, 0).multiplyScalar(panSpeed);
        
        // 旋转平移方向以匹配相机视角
        const cameraQuaternion = new THREE.Quaternion().setFromRotationMatrix(
            new THREE.Matrix4().lookAt(
                this.camera.position,
                this.cameraTarget,
                new THREE.Vector3(0, 1, 0)
            )
        );
        
        panDirection.applyQuaternion(cameraQuaternion);
        
        this.camera.position.add(panDirection);
        this.cameraTarget.add(panDirection);
    }
    
    zoomCamera(delta) {
        const zoomSpeed = 0.1;
        const minDistance = 5; // 最小距离，防止穿模
        const maxDistance = 50; // 最大距离
        
        // 计算当前相机到目标点的向量
        const cameraToTarget = new THREE.Vector3()
            .subVectors(this.camera.position, this.cameraTarget);
        
        // 计算当前距离
        let currentDistance = cameraToTarget.length();
        
        // 计算新距离
        let newDistance = currentDistance - delta * zoomSpeed;
        
        // 限制距离范围
        newDistance = Math.max(minDistance, Math.min(maxDistance, newDistance));
        
        // 更新相机位置
        cameraToTarget.normalize().multiplyScalar(newDistance);
        this.camera.position.copy(this.cameraTarget).add(cameraToTarget);
    }
    
    handleClick(event) {
        if (this.gameOver) return;
        
        // 提高鼠标坐标转换精度
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // 更新射线
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // 获取所有棋盘格子（排除线框）
        const gridObjects = this.board.children.filter(child => 
            child.userData && child.userData.type === 'grid'
        );
        
        // 执行射线检测
        const intersects = this.raycaster.intersectObjects(gridObjects);
        
        if (intersects.length > 0) {
            // 找到最近的交点
            const closestIntersect = intersects[0];
            const grid = closestIntersect.object;
            const { x, y, z } = grid.userData;
            
            if (this.boardData[x][y][z] === null) {
                this.placePiece(x, y, z);
                
                if (this.checkWin(x, y, z)) {
                    this.endGame(this.currentPlayer);
                } else if (this.isBoardFull()) {
                    this.endGame('draw');
                } else {
                    this.switchPlayer();
                    
                    // AI回合
                    if (this.gameMode === 'ai' && this.currentPlayer === 'white') {
                        setTimeout(() => this.aiMove(), 500);
                    }
                }
            }
        }
    }
    
    placePiece(x, y, z) {
        this.boardData[x][y][z] = this.currentPlayer;
        
        const gridSize = 2;
        const offset = (this.boardSize - 1) * gridSize / 2;
        const radius = gridSize * 0.4;
        
        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = this.getPieceMaterial(this.currentPlayer);
        const piece = new THREE.Mesh(geometry, material);
        
        piece.position.set(
            x * gridSize - offset,
            y * gridSize - offset,
            z * gridSize - offset
        );
        
        // 设置棋子的渲染顺序，确保显示在棋盘上方
        piece.renderOrder = 1;
        piece.userData = { x, y, z, player: this.currentPlayer };
        this.scene.add(piece);
        this.pieces.push(piece);
    }
    
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        this.updateCurrentPlayerDisplay();
    }
    
    updateCurrentPlayerDisplay() {
        const element = document.getElementById('current-player');
        element.textContent = `当前玩家: ${this.currentPlayer === 'black' ? '黑方' : '白方'}`;
        element.className = `player-${this.currentPlayer}`;
    }
    
    checkWin(x, y, z) {
        const player = this.currentPlayer;
        
        // 检查所有可能的方向
        for (const [dx, dy, dz] of this.directions) {
            let count = 1;
            
            // 向正方向检查
            for (let i = 1; i < 5; i++) {
                const nx = x + dx * i;
                const ny = y + dy * i;
                const nz = z + dz * i;
                
                if (this.isValidPosition(nx, ny, nz) && this.boardData[nx][ny][nz] === player) {
                    count++;
                } else {
                    break;
                }
            }
            
            // 向反方向检查
            for (let i = 1; i < 5; i++) {
                const nx = x - dx * i;
                const ny = y - dy * i;
                const nz = z - dz * i;
                
                if (this.isValidPosition(nx, ny, nz) && this.boardData[nx][ny][nz] === player) {
                    count++;
                } else {
                    break;
                }
            }
            
            if (count >= 5) {
                return true;
            }
        }
        
        return false;
    }
    
    isValidPosition(x, y, z) {
        return x >= 0 && x < this.boardSize &&
               y >= 0 && y < this.boardSize &&
               z >= 0 && z < this.boardSize;
    }
    
    isBoardFull() {
        for (let x = 0; x < this.boardSize; x++) {
            for (let y = 0; y < this.boardSize; y++) {
                for (let z = 0; z < this.boardSize; z++) {
                    if (this.boardData[x][y][z] === null) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    endGame(winner) {
        this.gameOver = true;
        const winnerMessage = document.getElementById('winner-message');
        const winnerText = document.getElementById('winner-text');
        
        if (winner === 'draw') {
            winnerText.textContent = '平局！';
        } else {
            winnerText.textContent = `${winner === 'black' ? '黑方' : '白方'}获胜！`;
        }
        
        winnerMessage.style.display = 'block';
    }
    
    aiMove() {
        // 简单的AI算法：优先防守，然后进攻
        let bestMove = null;
        let bestScore = -Infinity;
        
        // 遍历所有可能的位置
        for (let x = 0; x < this.boardSize; x++) {
            for (let y = 0; y < this.boardSize; y++) {
                for (let z = 0; z < this.boardSize; z++) {
                    if (this.boardData[x][y][z] === null) {
                        // 评估该位置的分数
                        const score = this.evaluatePosition(x, y, z);
                        
                        if (score > bestScore) {
                            bestScore = score;
                            bestMove = { x, y, z };
                        }
                    }
                }
            }
        }
        
        if (bestMove) {
            this.placePiece(bestMove.x, bestMove.y, bestMove.z);
            
            if (this.checkWin(bestMove.x, bestMove.y, bestMove.z)) {
                this.endGame(this.currentPlayer);
            } else if (this.isBoardFull()) {
                this.endGame('draw');
            } else {
                this.switchPlayer();
            }
        }
    }
    
    evaluatePosition(x, y, z) {
        let score = 0;
        const aiPlayer = 'white';
        const humanPlayer = 'black';
        
        // 评估所有方向上的潜在连子
        for (const [dx, dy, dz] of this.directions) {
            let aiCount = 0;
            let humanCount = 0;
            let aiBlocked = 0;
            let humanBlocked = 0;
            
            // 检查当前位置在该方向上的连子情况
            for (let i = -4; i <= 4; i++) {
                if (i === 0) continue; // 跳过当前位置
                
                const nx = x + dx * i;
                const ny = y + dy * i;
                const nz = z + dz * i;
                
                if (this.isValidPosition(nx, ny, nz)) {
                    const piece = this.boardData[nx][ny][nz];
                    if (piece === aiPlayer) {
                        aiCount++;
                    } else if (piece === humanPlayer) {
                        humanCount++;
                    }
                } else {
                    // 边界视为阻挡
                    if (i < 0) {
                        aiBlocked++;
                        humanBlocked++;
                    }
                }
            }
            
            // 简单的评分规则
            if (aiCount === 4) score += 1000; // 四子连珠，必胜
            else if (aiCount === 3) score += 100; // 三子连珠
            else if (aiCount === 2) score += 10; // 二子连珠
            
            if (humanCount === 4) score += 500; // 防守对方四子
            else if (humanCount === 3) score += 50; // 防守对方三子
            else if (humanCount === 2) score += 5; // 防守对方二子
        }
        
        return score;
    }
    
    newGame() {
        this.currentPlayer = 'black';
        this.gameOver = false;
        this.gameMode = document.getElementById('game-mode').value;
        this.boardSize = parseInt(document.getElementById('board-size').value);
        
        this.initBoard();
        this.updateCurrentPlayerDisplay();
        document.getElementById('winner-message').style.display = 'none';
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}

// 初始化游戏
window.addEventListener('DOMContentLoaded', () => {
    const game = new ThreeDimensionalGomoku();
});
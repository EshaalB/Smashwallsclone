const TWO_PI = Math.PI * 2;
const container = document.getElementById('container');

const clickSound = new Audio('smash2.mp3');

let vertices = [],
    indices = [],
    fragments = [],
    clickPosition = [window.innerWidth * 0.5, window.innerHeight * 0.5],
    currentColor = generateRandomColor(),
    isAnimating = false;  

window.onload = function() {
    gsap.set(container, {perspective: 500});
    container.style.backgroundColor = currentColor;
    container.addEventListener('click', onContainerClick);
    initShatterAnimation();
};

function generateRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function onContainerClick(event) {
    clickPosition[0] = event.clientX;
    clickPosition[1] = event.clientY;
    
    
    clickSound.currentTime = 0;
    clickSound.play();
    
     currentColor = generateRandomColor();
    container.style.backgroundColor = currentColor;
    restartShatterAnimation();
}

function triangulate() {
    const rings = [
        {r: 50, c: 12},
        {r: 150, c: 12},
        {r: 300, c: 12},
        {r: 1200, c: 12} 
    ];

    vertices = [[clickPosition[0], clickPosition[1]]];

    rings.forEach(ring => {
        const radius = ring.r,
              count = ring.c,
              variance = radius * 0.25;

        for (let i = 0; i < count; i++) {
            const x = Math.cos((i / count) * TWO_PI) * radius + clickPosition[0] + randomRange(-variance, variance);
            const y = Math.sin((i / count) * TWO_PI) * radius + clickPosition[1] + randomRange(-variance, variance);
            vertices.push([x, y]);
        }
    });

    vertices.forEach(v => {
        v[0] = clamp(v[0], 0, window.innerWidth);
        v[1] = clamp(v[1], 0, window.innerHeight);
    });

    indices = Delaunay.triangulate(vertices);
}

function shatter() {
    if (isAnimating) return; 
    isAnimating = true;

    const tl0 = gsap.timeline({
        repeat: -1,
        repeatDelay: 2,
        onComplete: shatterCompleteHandler
    });

    fragments.forEach(f => container.removeChild(f.canvas));
    fragments.length = 0;

    for (let i = 0; i < indices.length; i += 3) {
        const p0 = vertices[indices[i + 0]],
              p1 = vertices[indices[i + 1]],
              p2 = vertices[indices[i + 2]];

        const fragment = new Fragment(p0, p1, p2);

        const dx = fragment.centroid[0] - clickPosition[0],
              dy = fragment.centroid[1] - clickPosition[1],
              d = Math.sqrt(dx * dx + dy * dy),
              rx = 30 * sign(dy),
              ry = 90 * -sign(dx),
              delay = d * 0.003 * randomRange(0.9, 1.1);

        fragment.canvas.style.zIndex = Math.floor(d).toString();
        fragment.canvas.style.backgroundColor = container.style.backgroundColor;

        const tl1 = gsap.timeline();

        tl1.to(fragment.canvas, {
            duration: 1,
            z: -500,
            rotationX: rx,
            rotationY: ry,
            ease: "cubic.in"
        });
        tl1.to(fragment.canvas, {
            duration: 0.4,
            opacity: 0,
            ease: "power2.out"
        }, 0.6);

        tl0.add(tl1, delay);
        fragments.push(fragment);
        container.appendChild(fragment.canvas);
    }
}

function initShatterAnimation() {
    triangulate();
    shatter();
}

function restartShatterAnimation() {
    // Stop the previous animation and start a new one
    if (isAnimating) {
        gsap.globalTimeline.clear(); // Stop any ongoing animations
        isAnimating = false;
    }
    shatter();
    container.style.backgroundColor = generateRandomColor();
}

function shatterCompleteHandler() {
    
    fragments.forEach(f => container.removeChild(f.canvas));
    fragments.length = 0;
    vertices.length = 0;
    indices.length = 0;

    isAnimating = false;  
}

function randomRange(min, max) {
    return min + (max - min) * Math.random();
}

function clamp(x, min, max) {
    return x < min ? min : (x > max ? max : x);
}

function sign(x) {
    return x < 0 ? -1 : 1;
}

class Fragment {
    constructor(v0, v1, v2) {
        this.v0 = v0;
        this.v1 = v1;
        this.v2 = v2;

        this.computeBoundingBox();
        this.computeCentroid();
        this.createCanvas();
        this.clip();
    }

    computeBoundingBox() {
        const xMin = Math.min(this.v0[0], this.v1[0], this.v2[0]),
              xMax = Math.max(this.v0[0], this.v1[0], this.v2[0]),
              yMin = Math.min(this.v0[1], this.v1[1], this.v2[1]),
              yMax = Math.max(this.v0[1], this.v1[1], this.v2[1]);

        this.box = {
            x: xMin,
            y: yMin,
            w: xMax - xMin,
            h: yMax - yMin
        };
    }

    computeCentroid() {
        const x = (this.v0[0] + this.v1[0] + this.v2[0]) / 3,
              y = (this.v0[1] + this.v1[1] + this.v2[1]) / 3;

        this.centroid = [x, y];
    }

    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.box.w;
        this.canvas.height = this.box.h;
        this.canvas.style.width = this.box.w + 'px';
        this.canvas.style.height = this.box.h + 'px';
        this.canvas.style.left = this.box.x + 'px';
        this.canvas.style.top = this.box.y + 'px';
        this.canvas.style.position = 'absolute';
        this.ctx = this.canvas.getContext('2d');
    }

    clip() {
        this.ctx.translate(-this.box.x, -this.box.y);
        this.ctx.beginPath();
        this.ctx.moveTo(this.v0[0], this.v0[1]);
        this.ctx.lineTo(this.v1[0], this.v1[1]);
        this.ctx.lineTo(this.v2[0], this.v2[1]);
        this.ctx.closePath();
        this.ctx.clip();


        this.ctx.fillStyle = container.style.backgroundColor;
        this.ctx.fillRect(0, 0, this.box.w, this.box.h);
    }
}

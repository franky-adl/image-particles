// ThreeJS and Third-party deps
import * as THREE from "three"
import * as dat from 'dat.gui'
import Stats from "three/examples/jsm/libs/stats.module"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

// Core boilerplate code deps
import { createCamera, createRenderer, runApp } from "./core-utils"

global.THREE = THREE

/**************************************************
 * 0. Tweakable parameters for the scene
 *************************************************/
const params = {
  // general scene params
  colors: ['#F7A541', '#F45D4C', '#FA2E59', '#4783c3', '#9c6cb7'],
  graphicCanvasWidth: 240,
  graphicCanvasHeight: 240,
  graphicOffsetX: 240 / 2,
  graphicOffsetY: 240 / 3,
  images: [
    "./assets/icons8-avengers-480.png",
    "./assets/icons8-apple-logo-480.png",
    "./assets/icons8-google-earh-480.png",
    "./assets/icons8-google-images-480.png",
    "./assets/icons8-iron-man-480.png",
    "./assets/icons8-rebel-480.png"
  ],
  imgIndex: 0,
  cameraPos: { x: 0, y: 0, z: 800 },
  cameraLookAt: new THREE.Vector3(0, 0, 0),
  cameraPosTarget: new THREE.Vector3(0, 0, 800),
}


/**************************************************
 * 1. Initialize core threejs components
 *************************************************/
// Create the scene
let scene = new THREE.Scene()

// Create the renderer via 'createRenderer',
// 1st param receives additional WebGLRenderer properties
// 2nd param receives a custom callback to further configure the renderer
let renderer = createRenderer({ antialias: false }, (_renderer) => {
  // e.g. uncomment below if you want the output to be in sRGB color space
  // _renderer.outputEncoding = THREE.sRGBEncoding
})

// Create the camera
// Pass in fov, near, far and camera position respectively
let camera = createCamera(75, 1, 3000, params.cameraPos)

/**************************************************
 * 2. Build your scene in this threejs app
 * This app object needs to consist of at least the async initScene() function (it is async so the animate function can wait for initScene() to finish before being called)
 * initScene() is called after a basic threejs environment has been set up, you can add objects/lighting to you scene in initScene()
 * if your app needs to animate things(i.e. not static), include a updateScene(interval, elapsed) function in the app as well
 *************************************************/
let app = {
  async initScene() {
    // OrbitControls
    this.controls = new OrbitControls(camera, renderer.domElement)
    this.controls.enableDamping = true

    scene.background = new THREE.Color(0xFFFFFF)

    this.particles = []
    this.particlesInfo = []

    // Initialize canvas and images
    let graphicCanvas = document.createElement('canvas')
    graphicCanvas.width = params.graphicCanvasWidth
    graphicCanvas.height = params.graphicCanvasHeight
    // canvas context later used to switch and draw icons
    this.gctx = graphicCanvas.getContext('2d')
    // a array of the icons loaded in the html
    this.graphics = document.querySelectorAll('#imgs-container img')
    this.currentGraphic = 0

    // draw current icon, update graphicPixels and set up particles positions
    this.updateGraphic()

    // GUI controls
    const gui = new dat.GUI()

    // add onclick listener for Next image button to load other images
    const el = document.getElementById("toggle-img")
    el.addEventListener("click", () => {
      this.currentGraphic++
      this.updateGraphic()
    }, false)

    // add mouse move listener to update cameraPosTarget for animating the camera angle movement
    window.addEventListener('mousemove', (event) => {
      mouseX = (event.clientX - window.innerWidth / 2);
      mouseY = (event.clientY - window.innerHeight / 2);
      params.cameraPosTarget.x = (mouseX * -1) / 2;
      params.cameraPosTarget.y = mouseY / 2;
    }, false);

    // Stats - show fps
    this.stats1 = new Stats()
    this.stats1.showPanel(0) // Panel 0 = fps
    this.stats1.domElement.style.cssText = "position:absolute;top:0px;left:0px;"
    // this.container is the parent DOM element of the threejs canvas element
    this.container.appendChild(this.stats1.domElement)
  },
  // @param {number} interval - time elapsed between 2 frames
  // @param {number} elapsed - total time elapsed since app start
  updateScene(interval, elapsed) {
    this.controls.update()
    this.stats1.update()

    for (var i = 0, l = this.particles.length; i < l; i++) {
      this.particles[i].rotation.x += this.particlesInfo[i].vx
      this.particles[i].rotation.y += this.particlesInfo[i].vy
      this.particles[i].position.lerp(this.particles[i].targetPosition, 0.2)
    }

    camera.position.lerp(params.cameraPosTarget, 0.2)
    // crucial to set lookAt to stabilise the camera movement
    camera.lookAt(params.cameraLookAt)
  },
  updateGraphic() {
    const img = this.graphics[this.currentGraphic % this.graphics.length]
    this.gctx.clearRect(0, 0, params.graphicCanvasWidth, params.graphicCanvasHeight)
    this.gctx.drawImage(img, 0, 0, params.graphicCanvasWidth, params.graphicCanvasHeight)

    const gData = this.gctx.getImageData(0, 0, params.graphicCanvasWidth, params.graphicCanvasHeight).data
    this.graphicPixels = []

    for (let i = gData.length; i >= 0; i -= 4) {
      if (gData[i] == 0 && gData[i + 3] > 0) { // check if black pixel
        const x = (i / 4) % params.graphicCanvasWidth
        const y = params.graphicCanvasHeight - Math.floor(i / 4 / params.graphicCanvasWidth)

        if ((x && x % 2 == 0) && (y && y % 2 == 0)) {
          this.graphicPixels.push({
            x: x,
            y: y
          })
        }
      }
    }

    // console.log(this.graphicPixels)

    for (let i = 0; i < this.particles.length; i++) {
      this.randomPos(this.particles[i].targetPosition)
    }

    setTimeout(() => {
      this.setParticles()
    }, 500)
  },
  setParticles() {
    for (let i = 0; i < this.graphicPixels.length; i++) {
      if (this.particles[i]) {
        const pos = this.getGraphicPos(this.graphicPixels[i])
        this.particles[i].targetPosition.x = pos.x
        this.particles[i].targetPosition.y = pos.y
        this.particles[i].targetPosition.z = pos.z
      } else {
        const p = this.createParticle(i)
        this.particles[i] = p
        this.particlesInfo[i] = {
          vx: Math.random() * 0.05,
          vy: Math.random() * 0.05,
        }
        scene.add(p)
      }
    }

    for (let i = this.graphicPixels.length; i < this.particles.length; i++) {
      this.randomPos(this.particles[i].targetPosition, true)
    }

    console.log('Total Particles: ' + this.particles.length)
  },
  createParticle(i) {
    // const particle = new THREE.Object3D();
    const geometryCore = new THREE.SphereGeometry(2, 4, 4)
    const materialCore = new THREE.MeshBasicMaterial({
      color: params.colors[i % params.colors.length]
    })

    const box = new THREE.Mesh(geometryCore, materialCore)

    const pos = this.getGraphicPos(this.graphicPixels[i])
    box.targetPosition = new THREE.Vector3(pos.x, pos.y, pos.z)

    this.randomPos(box.position)

    // TODO: fix geometry.vertices is undefined
    const positions = box.geometry.attributes.position.array
    let x, y, z, index
    x = y = z = index = 0
    for (var j = 0; j < positions.length / 3; j++) {
      positions[index++] = x
      positions[index++] = y
      positions[index++] = z

      x = -3 + Math.random() * 6
      y = -3 + Math.random() * 6
      z = -3 + Math.random() * 6
    }

    return box
  },
  getGraphicPos(pixel) {
    const posX = (pixel.x - params.graphicOffsetX - Math.random() * 4 - 2) * 3
    const posY = (pixel.y - params.graphicOffsetY - Math.random() * 4 - 2) * 3
    const posZ = -20 * Math.random() + 40

    return { x: posX, y: posY, z: posZ }
  },
  randomPos(vector, outFrame = false) {
    const windowWidth = window.innerWidth
    const radius = outFrame ? (windowWidth * 2) : (windowWidth * -2)
    const centerX = 0
    const centerY = 0

    // ensure that p(r) ~ r instead of p(r) ~ constant
    const r = windowWidth + radius * Math.random()
    const angle = Math.random() * Math.PI * 2

    // compute desired coordinates
    vector.x = centerX + r * Math.cos(angle)
    vector.y = centerY + r * Math.sin(angle)
    vector.z = Math.random() * windowWidth
  }
}

/**************************************************
 * 3. Run the app
 * 'runApp' will do most of the boilerplate setup code for you:
 * e.g. HTML container, window resize listener, mouse move/touch listener for shader uniforms, THREE.Clock() for animation
 * Executing this line puts everything together and runs the app
 * ps. if you don't use custom shaders, pass undefined to the 'uniforms'(2nd-last) param
 * ps. if you don't use post-processing, pass undefined to the 'composer'(last) param
 *************************************************/
runApp(app, scene, renderer, camera, true, undefined, undefined)

import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { color, pass, screenUV } from "three/tsl";

import { dotScreen } from 'three/addons/tsl/display/DotScreenNode.js';
import { rgbShift } from 'three/addons/tsl/display/RGBShiftNode.js';
import { sobel } from "three/addons/examples/jsm/tsl/display/SobelOperatorNode.js";
import { pixelationPass } from 'three/addons/tsl/display/PixelationPassNode.js';
import { afterImage } from 'three/addons/tsl/display/AfterImageNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

import { outline } from 'three/addons/tsl/display/OutlineNode.js';

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();

scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 4;
const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// background
const bgColor = screenUV.y.mix(color(0x102050), color(0x102050));
const bgVignette = screenUV.distance(.35).remapClamp(0.0, 0.6).oneMinus();
const bgIntensity = 1;
scene.backgroundNode = bgColor.mul(bgVignette.mul(bgIntensity));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const manager = new THREE.LoadingManager();
const loader = new FBXLoader(manager);
const path = "./assets/Y Bot.fbx";
let character;
const sceneData = {
  character: null,
  animations: [],
};
loader.load(path, (fbx) => {

  function getMaterial() {
    const material = new THREE.MeshLambertMaterial({
      color: 0x000000,
    });
    return material;
  }

  function initCharacter(fbx) {
    const char = fbx;
    char.scale.setScalar(0.02);
    char.position.set(0, -2, 0);
    char.traverse((c) => {
      if (c.isMesh) {
        if (c.material.name === "Alpha_Body_MAT") {
          c.material.color = new THREE.Color(0xbbbb00);
        }
        // c.material = getMaterial();
      }
    });

    const mixer = new THREE.AnimationMixer(char);
    const update = (t) => {
      mixer.update(t); // animation speed
    };
    char.userData = { mixer, update };
    return char;
  }
  character = initCharacter(fbx);
  sceneData.character = character;
});

//
const animations = [
  // "Being Electrocuted",
  // "Drunk Walk",
  "Female Dynamic Pose",
  "Female Dynamic Pose-02",
  "Floating",
  "Flying",
  // "Idle",
  // "Joyful Jump",
  // "Kneeling Pointing",
  // "Low Crawl",
  // "Male Dance Pose",
  "Male Dynamic Pose",
  // "Neutral Idle",
  // "Reaction",
  // "Spat In Face",
  // "Stand To Roll",
  "Standard Walk",
  "Swimming",
  // "Thriller Part 3",
  "Treading Water",
  "Walking",
  // "Waving",
];
const apath = "./assets/animations/";
manager.onLoad = () => initScene(sceneData);
animations.forEach((name) => {
  loader.load(`${apath}${name}.fbx`, (fbx) => {
    let anim = fbx.animations[0];
    anim.name = name;
    sceneData.animations.push(anim);
  });
});

function setupActions(character, animations) {
  const actions = [];
  animations.forEach((anim) => {
    let action = character.userData.mixer.clipAction(anim);
    actions.push(action);
  });
  return actions;
}

function initScene(sceneData) {
  const { character, animations } = sceneData;
  const actions = setupActions(character, animations);
  scene.add(character);

  const sunLight = new THREE.DirectionalLight(0xffffff, 5);
  sunLight.position.set(2, 4, 3);
  sunLight.castShadow = true;
  scene.add(sunLight);

  const backLight = new THREE.DirectionalLight(0xffffff, 5);
  backLight.position.set(-2, 0, -3);
  scene.add(backLight);

  const hemiLight = new THREE.HemisphereLight(0x000000, 0xffff00, 1);
  scene.add(hemiLight);

  // postprocessing
  const postProcessing = new THREE.PostProcessing(renderer);
  const scenePass = pass(scene, camera);
  const scenePassColor = scenePass.getTextureNode();

  const dotScreenPass = dotScreen(scenePassColor);
  dotScreenPass.scale.value = 0.4;

  const sobelPass = sobel(scenePassColor);

  const rgbShiftPass = rgbShift(dotScreenPass);
  rgbShiftPass.amount.value = 0.005;

  const pixelation = pixelationPass(scene, camera);
  pixelation.pixelSize = 8;
  pixelation.normalEdgeStrength = 0.3;
  pixelation.depthEdgeStrength = 0.4;

  const afterImagePass = afterImage(sobelPass);
  afterImagePass.damp.value = 0.96;

  const bloomPass = bloom(sobelPass);
  bloomPass.strength = 1.5;
  bloomPass.radius = 0.4;
  bloomPass.threshold = 0.0;

  const outlinePass = outline(scene, camera, { 
    selectedObjects: [character],
   });

  postProcessing.outputNode = scenePass;

  const clock = new THREE.Clock();
  let nextTime = 2;
  function animate() {
    const delta = clock.getDelta();
    character?.userData.update(delta);
    // renderer.render(scene, camera);
    postProcessing.render();
    controls.update();
    if (clock.getElapsedTime() > nextTime) {
      playRandomAnimationClip();
      nextTime += 4;
    }
  }
  renderer.setAnimationLoop(animate);

  // animations
  let index = 2;
  let previousAction;
  playRandomAnimationClip();

  function handleWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", handleWindowResize, false);

  function playRandomAnimationClip() {

    const action = actions[index];
    if (action !== previousAction) {
      previousAction?.fadeOut(2);
      action.reset();
      action.fadeIn(2);
      action.play();
      previousAction = action;
    }
    index = Math.floor(Math.random() * actions.length);
  }
  window.addEventListener("keydown", (e) => {
    if (e.key === " ") {
      playRandomAnimationClip();
    }
  });
}

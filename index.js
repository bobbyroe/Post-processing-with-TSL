import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { color, screenUV } from "three/tsl";
const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();

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
manager.onLoad = () => initScene(sceneData);
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
      color: 0xffffff,
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
          c.material.color = new THREE.Color(0xdddd00);
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
  "Female Dynamic Pose",
  "Female Dynamic Pose-02",
  "Floating",
  "Flying",
  "Male Dynamic Pose",
  "Standard Walk",
  "Swimming",
  "Treading Water",
  "Walking",
];
const apath = "./assets/animations/";
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

  const clock = new THREE.Clock();
  let nextTime = 2;
  function animate() {
    const delta = clock.getDelta();
    character?.userData.update(delta);
    renderer.render(scene, camera);
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
}

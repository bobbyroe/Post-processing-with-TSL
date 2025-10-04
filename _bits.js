import { /* color, */ pass, /* screenUV */ } from "three/tsl"; 
import { dotScreen } from 'three/addons/tsl/display/DotScreenNode.js';
import { rgbShift } from 'three/addons/tsl/display/RGBShiftNode.js';
import { sobel } from "../../src/examples/jsm/tsl/display/SobelOperatorNode.js";
import { pixelationPass } from 'three/addons/tsl/display/PixelationPassNode.js';
import { afterImage } from 'three/addons/tsl/display/AfterImageNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

import { outline } from 'three/addons/tsl/display/OutlineNode.js';

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



  // animate() {}
    postProcessing.render();
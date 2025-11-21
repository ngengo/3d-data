import * as THREE from 'three';
// FIX: Removed ".min" because the minified file does not exist in this version's folder
import TWEEN from 'three/addons/libs/tween.module.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

let camera, scene, renderer, controls;
const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };

// --- CONFIGURATION ---
// Your exact Spreadsheet ID
const SPREADSHEET_ID = '1f90jkdcZBug3EA6JvLqCZI3USNBAbI-eO3iI5nFkB60'; 
// Your exact API Key
const API_KEY = 'AIzaSyBy3qUjO7CiQ-9F0jEvXcnFdS_8HaESMeA';

export function initVisualization() {
    console.log("Starting Visualization...");
    fetchSheetData();
}

function fetchSheetData() {
    // Requesting data from Sheet1
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A2:F?key=${API_KEY}`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error ${response.status}: Check API Key or Permissions`);
            }
            return response.json();
        })
        .then(data => {
            if (data.values && data.values.length > 0) {
                console.log("Data loaded:", data.values.length, "rows");
                initThreeJS(data.values);
                animate();
            } else {
                alert("Google Sheet is empty or could not be read.\nCheck Console (F12) for details.");
            }
        })
        .catch(err => {
            console.error(err);
            alert("Failed to load data.\n1. Check Internet\n2. Check API Key\n3. Open Console (F12) for red error text.");
        });
}

function initThreeJS(tableData) {
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 3000;

    scene = new THREE.Scene();

    // --- 1. CREATE OBJECTS ---
    for (let i = 0; i < tableData.length; i++) {
        const row = tableData[i];
        
        // Mapping based on your "Data Template" structure
        // [0]Name, [1]Photo, [2]Age, [3]Country, [4]Interest, [5]Net Worth
        const name = row[0] || "Unknown";
        const photoUrl = row[1] || ""; 
        const netWorthStr = row[5] || "$0"; 

        // Clean net worth string for coloring
        const netWorthVal = parseInt(netWorthStr.replace(/[^0-9.-]+/g,"")) || 0;

        const element = document.createElement('div');
        element.className = 'element';
        
        // Color Logic
        let bgColor = 'rgba(255,0,0,0.85)'; // Default Red
        if (netWorthVal > 200000) {
            bgColor = 'rgba(0,128,0,0.85)'; // Green
        } else if (netWorthVal > 100000) {
            bgColor = 'rgba(255,165,0,0.85)'; // Orange
        }
        element.style.backgroundColor = bgColor;

        // HTML Structure (Photo + Name + Net Worth)
        element.innerHTML = `
            <div class="number">${i + 1}</div>
            <img src="${photoUrl}" class="profile-img" onerror="this.style.display='none'">
            <div class="details">
                <div class="name">${name}</div>
                <div class="networth">${netWorthStr}</div>
            </div>
        `;

        const object = new CSS3DObject(element);
        object.position.x = Math.random() * 4000 - 2000;
        object.position.y = Math.random() * 4000 - 2000;
        object.position.z = Math.random() * 4000 - 2000;
        scene.add(object);
        objects.push(object);
    }

    // --- 2. LAYOUTS ---
    
    // Table
    for (let i = 0; i < objects.length; i++) {
        const object = new THREE.Object3D();
        object.position.x = (i % 20) * 140 - 1330; 
        object.position.y = - (Math.floor(i / 20) * 180) + 990;
        targets.table.push(object);
    }

    // Sphere
    const vector = new THREE.Vector3();
    for (let i = 0, l = objects.length; i < l; i++) {
        const phi = Math.acos(-1 + (2 * i) / l);
        const theta = Math.sqrt(l * Math.PI) * phi;
        const object = new THREE.Object3D();
        object.position.setFromSphericalCoords(800, phi, theta);
        vector.copy(object.position).multiplyScalar(2);
        object.lookAt(vector);
        targets.sphere.push(object);
    }

    // Helix (Double)
    for (let i = 0, l = objects.length; i < l; i++) {
        let theta = i * 0.175 + Math.PI; 
        if (i % 2 === 1) theta += Math.PI; // Double Helix Logic
        const y = -(i * 8) + 450; 
        const object = new THREE.Object3D();
        object.position.setFromCylindricalCoords(900, theta, y);
        vector.x = object.position.x * 2;
        vector.y = object.position.y;
        vector.z = object.position.z * 2;
        object.lookAt(vector);
        targets.helix.push(object);
    }

    // Grid
    for (let i = 0; i < objects.length; i++) {
        const object = new THREE.Object3D();
        object.position.x = ((i % 5) * 400) - 800;
        object.position.y = (-(Math.floor(i / 5) % 4) * 400) + 800;
        object.position.z = (Math.floor(i / 20)) * 1000 - 2000;
        targets.grid.push(object);
    }

    // --- 3. RENDERER ---
    renderer = new CSS3DRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    controls = new TrackballControls(camera, renderer.domElement);
    controls.minDistance = 500;
    controls.maxDistance = 6000;
    controls.addEventListener('change', render);

    document.getElementById('table').addEventListener('click', () => transform(targets.table, 2000));
    document.getElementById('sphere').addEventListener('click', () => transform(targets.sphere, 2000));
    document.getElementById('helix').addEventListener('click', () => transform(targets.helix, 2000));
    document.getElementById('grid').addEventListener('click', () => transform(targets.grid, 2000));

    transform(targets.table, 2000);
    window.addEventListener('resize', onWindowResize, false);
}

function transform(targets, duration) {
    TWEEN.removeAll();
    for (let i = 0; i < objects.length; i++) {
        const object = objects[i];
        const target = targets[i];
        new TWEEN.Tween(object.position)
            .to({ x: target.position.x, y: target.position.y, z: target.position.z }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
        new TWEEN.Tween(object.rotation)
            .to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
    }
    new TWEEN.Tween(this)
        .to({}, duration * 2)
        .onUpdate(render)
        .start();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
}

function render() {
    renderer.render(scene, camera);
}
import json
import re
from typing import Dict, Any, List
from services.llm_service import call_groq_with_fallback

SYSTEM_INSTRUCTION_3D = """
You are AERIX 3D Studio, an elite Three.js WebGL Graphics Engineer.
Your mission is to generate production-grade, stunning, interactive procedural 3D scenes in pure JavaScript (Three.js) based on the user's prompt.

CORE ARCHITECTURAL RULES:
1. Environment Parameters:
   The code executes inside a function with these parameters in scope: (scene, camera, renderer, THREE)
   DO NOT instantiate a new scene, camera, or renderer.

2. MANDATORY 3D VOLUME & COMPLETENESS:
   - Always construct complete, solid, volumetric 3D objects with recognizable form (NEVER generate flat slivers, isolated thin planes, or 2D lines unless explicitly requested).
   - Use compound geometries: build composite objects combining multiple meshes (e.g. main body + accent details + rings/frames + emissive cores) grouped inside a `const group = new THREE.Group();` and added to `scene.add(group);`.
   - Scale: Keep dimensions well-proportioned (between 2.0 and 4.0 units wide/tall). Center the primary subject at (0, 0, 0).

3. RICH MATERIALS & GLOW:
   - Use vibrant MeshStandardMaterial or MeshPhysicalMaterial with metalness (0.3-0.85), roughness (0.15-0.4), and radiant emissive colors for sci-fi/energy elements.
   - For all materials, specify high-contrast colors (e.g. crimson red 0xff3344, electric cyan 0x00d4ff, neon amber 0xffaa00, chrome 0xf0f0f5).

4. BRIGHT ILLUMINATION:
   - Always add bright multi-source lighting: an AmbientLight (intensity 1.5+), plus 2 or more DirectionalLights / PointLights from different angles so all facets gleam.

5. SMOOTH ANIMATION:
   - MUST return an animation loop callback:
     return function animate(time) {
         // 'time' is float timestamp in seconds
         // Rotate meshes, pulse scales with Math.sin(time), etc.
     };

6. STRICT OUTPUT MANDATE:
   - Output ONLY the raw JavaScript code body inside ```javascript ... ``` code fences.
   - Do NOT wrap in JSON. Never output {"title": ...}.
   - You may put a one-line comment at the top for the title: // Title: Your Scene Title
"""

PRESET_SCENES: List[Dict[str, Any]] = [
    {
        "id": "cyber-core",
        "title": "AERIX Crimson Core",
        "description": "A radiant energy core enveloped by metallic orbital rings and an ambient ember field.",
        "prompt": "AERIX rotating crimson energy core with glowing particles",
        "code": """// AERIX Crimson Core
camera.position.set(0, 1.5, 6);
camera.lookAt(0, 0, 0);

// Lighting
const ambientLight = new THREE.AmbientLight(0x0a0a14, 1.2);
scene.add(ambientLight);

const redPoint = new THREE.PointLight(0xff3344, 3.5, 20);
redPoint.position.set(3, 4, 3);
scene.add(redPoint);

const whitePoint = new THREE.PointLight(0xffffff, 2.0, 20);
whitePoint.position.set(-3, -2, -3);
scene.add(whitePoint);

// Core glowing mesh
const coreGeo = new THREE.IcosahedronGeometry(1.1, 1);
const coreMat = new THREE.MeshStandardMaterial({
    color: 0xff3344,
    emissive: 0x550011,
    roughness: 0.2,
    metalness: 0.9,
    wireframe: true
});
const coreMesh = new THREE.Mesh(coreGeo, coreMat);
scene.add(coreMesh);

// Inner solid sphere
const innerGeo = new THREE.SphereGeometry(0.7, 32, 32);
const innerMat = new THREE.MeshStandardMaterial({
    color: 0x111116,
    emissive: 0x220508,
    roughness: 0.1,
    metalness: 0.9
});
const innerSphere = new THREE.Mesh(innerGeo, innerMat);
scene.add(innerSphere);

// Outer Orbital Gimbal Rings
const ringGroup = new THREE.Group();
const ringMat1 = new THREE.MeshStandardMaterial({ color: 0xff3344, metalness: 0.9, roughness: 0.3 });
const ringMat2 = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.9, roughness: 0.3 });

const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.035, 16, 100), ringMat1);
const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.035, 16, 100), ringMat2);
ring2.rotation.x = Math.PI / 3;
ringGroup.add(ring1);
ringGroup.add(ring2);
scene.add(ringGroup);

// Particle Swarm
const particleCount = 800;
const particleGeo = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount * 3; i += 3) {
    const radius = 2.5 + Math.random() * 3.0;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);

    positions[i] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i + 2] = radius * Math.cos(phi);

    const mix = Math.random();
    colors[i] = mix > 0.5 ? 1.0 : 0.8;
    colors[i + 1] = mix > 0.5 ? 0.2 : 0.8;
    colors[i + 2] = mix > 0.5 ? 0.27 : 0.8;
}

particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const particleMat = new THREE.PointsMaterial({
    size: 0.035,
    vertexColors: true,
    transparent: true,
    opacity: 0.75
});
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

// Animation Loop
return function animate(time) {
    coreMesh.rotation.x = time * 0.4;
    coreMesh.rotation.y = time * 0.6;

    const scale = 1.0 + Math.sin(time * 3) * 0.06;
    innerSphere.scale.set(scale, scale, scale);

    ring1.rotation.x = time * 0.6;
    ring1.rotation.y = time * 0.4;
    ring2.rotation.y = time * -0.5;
    ring2.rotation.z = time * 0.3;

    particles.rotation.y = time * 0.12;
};"""
    },
    {
        "id": "quantum-knot",
        "title": "Quantum Torus Knot",
        "description": "An iridescent golden-emerald torus knot weaving through hyperspace with dynamic luminous reflections.",
        "prompt": "Golden quantum torus knot with radiant lighting",
        "code": """// Quantum Torus Knot
camera.position.set(0, 0, 7);
camera.lookAt(0, 0, 0);

// Atmospheric Studio Lighting
const ambient = new THREE.AmbientLight(0x1a1a2e, 1.5);
scene.add(ambient);

const goldLight = new THREE.DirectionalLight(0xffd700, 2.5);
goldLight.position.set(5, 5, 4);
scene.add(goldLight);

const emeraldLight = new THREE.PointLight(0x00ff88, 3, 15);
emeraldLight.position.set(-4, -3, 2);
scene.add(emeraldLight);

const violetLight = new THREE.PointLight(0x8a2be2, 2.5, 15);
violetLight.position.set(0, -4, -2);
scene.add(violetLight);

// Torus Knot
const knotGeo = new THREE.TorusKnotGeometry(1.6, 0.45, 180, 32, 2, 3);
const knotMat = new THREE.MeshPhysicalMaterial({
    color: 0x111122,
    emissive: 0x221144,
    roughness: 0.15,
    metalness: 0.95,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
});
const knot = new THREE.Mesh(knotGeo, knotMat);
scene.add(knot);

// Wireframe cage
const wireMat = new THREE.MeshBasicMaterial({
    color: 0x00ff88,
    wireframe: true,
    transparent: true,
    opacity: 0.15
});
const wireKnot = new THREE.Mesh(knotGeo, wireMat);
wireKnot.scale.set(1.02, 1.02, 1.02);
scene.add(wireKnot);

return function animate(time) {
    knot.rotation.x = time * 0.35;
    knot.rotation.y = time * 0.5;
    wireKnot.rotation.x = time * 0.35;
    wireKnot.rotation.y = time * 0.5;

    emeraldLight.position.x = Math.sin(time) * 4;
    emeraldLight.position.y = Math.cos(time) * 3;
};"""
    },
    {
        "id": "matrix-wave",
        "title": "Matrix Cyber Wave",
        "description": "A 3D mathematical sine-wave grid of pulsing glowing cubes undulating across a cyber plane.",
        "prompt": "Matrix cyber grid wave of glowing undulating cubes",
        "code": """// Matrix Cyber Grid Wave
camera.position.set(0, 5, 8);
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0x051015, 2));

const dirLight = new THREE.DirectionalLight(0x00ffaa, 2);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

const pointLight = new THREE.PointLight(0x00e5ff, 3, 20);
pointLight.position.set(0, 4, 0);
scene.add(pointLight);

const group = new THREE.Group();
const size = 18;
const spacing = 0.55;
const cubes = [];

const boxGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);

for (let x = -size / 2; x < size / 2; x++) {
    for (let z = -size / 2; z < size / 2; z++) {
        const mat = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            roughness: 0.3,
            metalness: 0.8
        });
        const mesh = new THREE.Mesh(boxGeo, mat);
        mesh.position.set(x * spacing, 0, z * spacing);
        group.add(mesh);
        cubes.push({ mesh, x, z, mat });
    }
}
scene.add(group);

return function animate(time) {
    group.rotation.y = time * 0.1;
    for (let i = 0; i < cubes.length; i++) {
        const c = cubes[i];
        const dist = Math.sqrt(c.x * c.x + c.z * c.z);
        const y = Math.sin(dist * 0.6 - time * 3.5) * 0.8;
        c.mesh.position.y = y;

        // Dynamic height-based emissive glow
        const glow = Math.max(0, (y + 0.8) / 1.6);
        c.mat.emissive.setRGB(0, glow * 0.7, glow * 0.9);
    }
};"""
    },
    {
        "id": "solar-system",
        "title": "Miniature Galactic System",
        "description": "A radiant central star encircled by concentric orbital tracks and celestial bodies.",
        "prompt": "Solar system with glowing sun and orbiting planets",
        "code": """// Galactic System
camera.position.set(0, 7, 9);
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0x151525, 1));

const sunLight = new THREE.PointLight(0xffeedd, 4, 30);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Sun
const sunGeo = new THREE.SphereGeometry(1.2, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xff9900 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// Sun Glow Atmosphere
const glowGeo = new THREE.SphereGeometry(1.4, 32, 32);
const glowMat = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    wireframe: true,
    transparent: true,
    opacity: 0.25
});
const glow = new THREE.Mesh(glowGeo, glowMat);
scene.add(glow);

// Planets & Orbits
const planets = [];
const planetData = [
    { radius: 2.5, size: 0.22, color: 0x00d4ff, speed: 1.8 },
    { radius: 3.8, size: 0.35, color: 0xff3366, speed: 1.2 },
    { radius: 5.2, size: 0.5,  color: 0xffaa00, speed: 0.8, ring: true },
    { radius: 6.8, size: 0.38, color: 0x9933ff, speed: 0.5 }
];

planetData.forEach((data) => {
    // Orbit line
    const orbitGeo = new THREE.BufferGeometry();
    const pts = [];
    for (let a = 0; a <= Math.PI * 2; a += 0.05) {
        pts.push(Math.cos(a) * data.radius, 0, Math.sin(a) * data.radius);
    }
    orbitGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const orbitLine = new THREE.Line(orbitGeo, new THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.4 }));
    scene.add(orbitLine);

    // Planet Mesh
    const pMesh = new THREE.Mesh(
        new THREE.SphereGeometry(data.size, 24, 24),
        new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.4, metalness: 0.6 })
    );
    scene.add(pMesh);

    // Optional Planetary Ring
    if (data.ring) {
        const ringMesh = new THREE.Mesh(
            new THREE.RingGeometry(data.size * 1.4, data.size * 2.2, 32),
            new THREE.MeshBasicMaterial({ color: 0xddbb88, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
        );
        ringMesh.rotation.x = Math.PI / 2.5;
        pMesh.add(ringMesh);
    }

    planets.push({ mesh: pMesh, radius: data.radius, speed: data.speed });
});

return function animate(time) {
    sun.rotation.y = time * 0.2;
    glow.rotation.y = -time * 0.3;

    planets.forEach((p) => {
        p.mesh.position.x = Math.cos(time * p.speed) * p.radius;
        p.mesh.position.z = Math.sin(time * p.speed) * p.radius;
        p.mesh.rotation.y = time * 2;
    });
};"""
    }
]


def clean_generated_code(raw_code: str) -> str:
    """Extract and sanitize raw JavaScript code from LLM response."""
    s = raw_code.strip()

    # 1. If wrapped in JSON inadvertently, extract 'code' field
    if s.startswith("{") and '"code"' in s:
        m = re.search(r'"code"\s*:\s*"([\s\S]*?)"\s*[,}]', s)
        if m:
            s = m.group(1).replace("\\n", "\n").replace('\\"', '"').replace("\\\\", "\\")
        else:
            s = re.sub(r'^\s*\{\s*"(?:title|description|code)"[\s\S]*?"code"\s*:\s*"?', "", s)
            s = re.sub(r'"?\s*\}\s*$', "", s)

    # 2. Strip markdown fences: ```javascript ... ```
    s = re.sub(r"^```(?:javascript|js|json)?\s*", "", s, flags=re.MULTILINE)
    s = re.sub(r"```$", "", s, flags=re.MULTILINE)

    # 3. Strip outer function wrapper if model wrote function(...) { ... }
    s = s.strip()
    func_match = re.search(r"^function\s*(?:[a-zA-Z0-9_$]+)?\s*\([^)]*\)\s*\{([\s\S]*)\}\s*;?$", s)
    if func_match:
        s = func_match.group(1).strip()

    # 4. Security: neutralize dangerous calls
    dangerous = ["document.cookie", "localStorage", "sessionStorage", "fetch(", "XMLHttpRequest", "eval(", "window.open"]
    for d in dangerous:
        if d in s:
            s = s.replace(d, f"/* blocked: {d} */")

    # 5. Sanity check: Ensure it has Three.js calls, otherwise fall back to preset
    if not s or ("scene" not in s and "THREE" not in s):
        return PRESET_SCENES[0]["code"]

    return s.strip()


def generate_3d_scene(prompt: str, language: str = "en") -> Dict[str, str]:
    """Generate a custom procedural Three.js scene based on user prompt."""
    if not prompt or not prompt.strip():
        p = PRESET_SCENES[0]
        return {
            "title": p["title"],
            "description": p["description"],
            "code": p["code"],
            "prompt": p["prompt"],
        }

    # Check for direct preset match
    prompt_lower = prompt.lower()
    for preset in PRESET_SCENES:
        if preset["id"] in prompt_lower or any(word in prompt_lower for word in preset["title"].lower().split()):
            return {
                "title": preset["title"],
                "description": preset["description"],
                "code": preset["code"],
                "prompt": prompt,
            }

    # Assemble messages for Groq requesting pure JavaScript code
    user_instruction = (
        f"Generate procedural Three.js JavaScript scene code for:\n\"{prompt}\"\n\n"
        "Remember: Output ONLY executable JavaScript inside ```javascript ... ```. Do NOT output JSON!"
    )

    messages = [
        {"role": "system", "content": SYSTEM_INSTRUCTION_3D},
        {"role": "user", "content": user_instruction}
    ]

    try:
        raw_output = call_groq_with_fallback(messages, max_tokens=2500)
        code = clean_generated_code(raw_output)

        # Extract title from initial comment if provided (e.g. // Title: Cyber Skull)
        title_match = re.search(r"//\s*(?:Title:)?\s*([^\n\r]+)", code)
        title = title_match.group(1).strip() if title_match else "Custom 3D Scene"
        if len(title) > 35:
            title = "Custom 3D Scene"

        return {
            "title": title,
            "description": f"Generated for: {prompt}",
            "code": code,
            "prompt": prompt
        }
    except Exception as e:
        print(f"[3D Generator] Generation error: {e}. Falling back to preset.")
        p = PRESET_SCENES[0]
        return {
            "title": p["title"],
            "description": f"{p['description']} (Fallback)",
            "code": p["code"],
            "prompt": prompt
        }

import { useEffect, useRef, useState } from "preact/hooks"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

import { request_archived_data_components, RequestDataComponentsReturn } from "core/data/fetch_from_db"
import { format_data_component_value_to_string } from "core/data/format/format_data_component_value_to_string"
import { IdAndVersion } from "core/data/id"
import { get_supabase } from "core/supabase"

import "./DemoSim.css"
import glowFragmentShader from "./shaders/glow/fragment.glsl"
import glowVertexShader from "./shaders/glow/vertex.glsl"


export const DemoSim = () =>
{
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        if (!canvasRef.current) return

        const canvas = canvasRef.current

        // Create scene
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xdddddd)

        // Create camera
        const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000)
        camera.position.z = 5

        // Create renderer
        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        })
        renderer.setSize(canvas.clientWidth, canvas.clientHeight)
        renderer.setPixelRatio(window.devicePixelRatio)

        // Add OrbitControls for mouse interaction
        const controls = new OrbitControls(camera, canvas)
        controls.enableDamping = true
        controls.dampingFactor = 0.1
        controls.enableZoom = true
        controls.enablePan = true

        // Create blue sphere
        const geometry_blue = new THREE.SphereGeometry(1, 64, 64)
        const material_blue = new THREE.MeshLambertMaterial({ color: 0x6666ff })
        const sphere_blue = new THREE.Mesh(geometry_blue, material_blue)
        scene.add(sphere_blue)

        // Create blue sphere glow
        const material_blue_glow = new THREE.ShaderMaterial({
            side: THREE.BackSide, // Render the glow on the inside
            transparent: true,
            vertexShader: glowVertexShader,
            fragmentShader: glowFragmentShader,
            uniforms: {
                uGlowColour: new THREE.Uniform(new THREE.Color(0xaaccff)),
            },
        })
        const sphere_blue_glow = new THREE.Mesh(geometry_blue, material_blue_glow)
        sphere_blue_glow.scale.set(1.15, 1.15, 1.15) // Slightly larger to create a glow effect
        scene.add(sphere_blue_glow)

        // Create yellow sphere
        const geometry_yellow = new THREE.SphereGeometry(0.2, 32, 32)
        const material_yellow = new THREE.MeshLambertMaterial({ color: 0xffff44 })
        const sphere_yellow = new THREE.Mesh(geometry_yellow, material_yellow)
        scene.add(sphere_yellow)

        // Add ambient lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5)
        scene.add(ambientLight)

        // Add directional light for better sphere definition
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
        directionalLight.position.set(5, 5, 5)
        scene.add(directionalLight)

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate)

            // Update controls for damping
            controls.update()

            // Rotate the sphere_yellow around the sphere_blue
            const rotation_speed = 0.001
            sphere_yellow.position.x = 2 * Math.cos(Date.now() * -rotation_speed)
            sphere_yellow.position.z = 2 * Math.sin(Date.now() * -rotation_speed)
            sphere_yellow.position.y = -1.5 * Math.cos(Date.now() * rotation_speed)

            renderer.render(scene, camera)
        }

        animate()

        // Handle window resize
        const handleResize = () => {
            const width = canvas.clientWidth
            const height = canvas.clientHeight

            camera.aspect = width / height
            camera.updateProjectionMatrix()
            renderer.setSize(width, height)
        }

        window.addEventListener("resize", handleResize)

        // Cleanup
        return () => {
            window.removeEventListener("resize", handleResize)
            controls.dispose()
            renderer.dispose()
        }
    }, [])

    return <div>
        <canvas ref={canvasRef} id="scene-3d"/>
        <h3>Demo Simulation</h3>
        <p>This is a placeholder for the demo simulation component.</p>
        <LoadData />
    </div>
}


function LoadData()
{
    const [response, set_response] = useState<RequestDataComponentsReturn | null>(null)

    useEffect(() =>
    {
        request_archived_data_components(get_supabase, [new IdAndVersion(10, 1)])
        .then(set_response)
    }, [])

    return <div>
        {response === null && <p>Loading data from WikiSim...</p>}
        {response && response.error && <p>Error loading data from WikiSim: {response.error.message}</p>}
        {response && response.data && <>
            Loaded {response.data.length} data components from WikiSim:
            <ul>
                {response.data.map((component, index) => (
                    <li key={index}>
                        <strong>ID:</strong> {component.id.id},
                        <strong>Version:</strong> {component.id.version},
                        <strong>Title:</strong> {component.title},
                        <strong>Value:</strong> {component.value},
                        <strong>Value as text:</strong> {format_data_component_value_to_string(component)}
                    </li>
                ))}
            </ul>
        </>}
    </div>
}

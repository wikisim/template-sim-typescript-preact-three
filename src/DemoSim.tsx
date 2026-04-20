import { useEffect, useRef, useState } from "preact/hooks"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

import { request_historical_data_components, RequestDataComponentsReturn } from "core/data/fetch_from_db"
import { format_data_component_value_to_string } from "core/data/format/format_data_component_value_to_string"
import { IdAndVersion } from "core/data/id"
import { get_supabase } from "core/supabase/browser"

import "./DemoSim.css"
import glowFragmentShader from "./shaders/glow/fragment.glsl"
import glowVertexShader from "./shaders/glow/vertex.glsl"
import { asset_url } from "./utils/asset_url"


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
        camera.position.z = 7
        const camera_y_offset = -1
        camera.position.y = camera_y_offset

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
        controls.target.set(0, camera_y_offset, 0)

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


        const add_cube_on_pointer_down = create_add_cube_on_pointer_down(scene, camera, renderer)


        // Animation loop
        let last_time = performance.now()
        const animate = (current_time: number) => {
            requestAnimationFrame(animate)
            const delta_time = current_time - last_time

            // Update controls for damping
            controls.update()

            // Rotate the sphere_yellow around the sphere_blue
            const rotation_speed = 0.001
            sphere_yellow.position.x = 2 * Math.cos(Date.now() * -rotation_speed)
            sphere_yellow.position.z = 2 * Math.sin(Date.now() * -rotation_speed)
            sphere_yellow.position.y = -1.5 * Math.cos(Date.now() * rotation_speed)

            add_cube_on_pointer_down.update(delta_time)

            renderer.render(scene, camera)
            last_time = current_time
        }

        animate(last_time)

        // Handle window resize
        const handle_resize = () => {
            const width = document.body.clientWidth
            const height = document.body.clientHeight

            camera.aspect = width / height
            camera.updateProjectionMatrix()
            renderer.setSize(width, height)
        }

        window.addEventListener("resize", handle_resize)

        // Cleanup
        return () => {
            window.removeEventListener("resize", handle_resize)
            controls.dispose()
            renderer.dispose()
            add_cube_on_pointer_down.dispose()
        }
    }, [])

    return <>
        <canvas ref={canvasRef} id="scene-3d"/>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(255, 255, 255, 0.8)", padding: "10px", borderRadius: "5px" }}>
            <h3>Demo Simulation</h3>
            <LoadData />
        </div>

        <img
            style={{ position: "absolute", top: 10, right: 10 }}
            src={asset_url("logo.svg")}
            title="This demos importing an asset using the asset_url function, which ensures the correct path is used in both development and production environments."
        />
    </>
}


function LoadData()
{
    const [response, set_response] = useState<RequestDataComponentsReturn | null>(null)

    useEffect(() =>
    {
        request_historical_data_components(get_supabase, [new IdAndVersion(1002, 6)])
        .then(set_response)
    }, [])

    return <div>
        {response === null && <p>Loading data from WikiSim...</p>}
        {response && response.error && <p>Error loading data from WikiSim: {response.error.message}</p>}
        {response && response.data && <>
            Demonstration of loading {response.data.length} data components from WikiSim:

            {response.data.map((component, index) => (
                <p key={index}>
                    <strong>ID:</strong> {component.id.id},
                    <strong>Version:</strong> {component.id.version},
                    <strong>Title:</strong> {component.title},
                    <strong>Value:</strong> {component.result_value},
                    <strong>Value as text:</strong> {format_data_component_value_to_string(component)}
                </p>
            ))}
        </>}
    </div>
}


function create_add_cube_on_pointer_down(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer)
{
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const cubes: THREE.Mesh[] = []

    // Add a transparent plane to receive pointer events
    const plane_geometry = new THREE.PlaneGeometry(100, 100)
    const plane_material = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.0, transparent: true })
    // Render plane on both sides to ensure it can be intersected from any angle
    plane_material.side = THREE.DoubleSide
    const plane = new THREE.Mesh(plane_geometry, plane_material)
    plane.rotation.x = -Math.PI / 2 // Rotate to be horizontal
    scene.add(plane)

    // Have the plane always align with the device's screen by updating its rotation
    // in the animation loop to look at the camera.  This works because the
    // camera has orbit controls enabled.
    const update_plane_rotation = (delta_time: number) => {
        plane.lookAt(camera.position)

        // Update the cubes to rotate around the y-axis
        cubes.forEach(cube => {
            cube.userData.angle -= (delta_time * cube.userData.speed)
            const radius = cube.userData.radius

            cube.position.x = radius * Math.cos(cube.userData.angle)
            cube.position.z = radius * Math.sin(cube.userData.angle)
        })
    }


    const on_pointer_down = (event: MouseEvent) =>
    {
        // Calculate mouse position in normalized device coordinates
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

        // Update the raycaster with the camera and mouse position
        raycaster.setFromCamera(mouse, camera)

        // Calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects(scene.children, true)

        const intersect = intersects[0]
        if (!intersect) return

        const point = intersect.point

        // Create a cube at the intersection point
        const cube_geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1)
        const cube_material = new THREE.MeshLambertMaterial({ color: 0xffffdd })
        cube_material.emissive = new THREE.Color(0xffffff) // Make the cube emissive so it stands out
        const cube = new THREE.Mesh(cube_geometry, cube_material)
        cube.position.copy(point)
        scene.add(cube)

        // Record the start time, radius, and speed for the cube's animation
        const angle = Math.atan2(cube.position.z, cube.position.x)
        const radius = new THREE.Vector2(cube.position.x, cube.position.z).length()
        // Have speed based on radius so that cubes farther from the center move slower.
        const speed = ((1 + Math.random() * 5) * 3e-4) / radius
        cube.userData = {
            start_time: Date.now(),
            angle,
            radius,
            speed,
        }

        cubes.push(cube)
    }

    renderer.domElement.addEventListener("pointerdown", on_pointer_down)

    // Cleanup function to remove the event listener when the component unmounts
    return {
        update: update_plane_rotation,
        dispose: () => {
            renderer.domElement.removeEventListener("pointerdown", on_pointer_down)
        },
    }
}

uniform vec3 uGlowColour;

varying vec3 vNormal;
varying vec3 vPosition;

void main()
{
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    vec3 normal = normalize(vNormal);

    // Fresnel effect
    float edgeAlpha = dot(viewDirection, normal);
    edgeAlpha = smoothstep(0.0, 0.9, edgeAlpha);

    // Final color
    gl_FragColor = vec4(uGlowColour, edgeAlpha);
}

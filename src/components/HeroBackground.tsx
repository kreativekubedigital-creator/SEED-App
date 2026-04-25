import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, BookOpen, Pencil, Globe, Calculator, Apple, Lightbulb, Brain } from 'lucide-react';

const icons = [GraduationCap, BookOpen, Pencil, Globe, Calculator, Apple, Lightbulb, Brain];

const FloatingIcon = ({ delay }: { delay: number }) => {
  const Icon = icons[Math.floor(Math.random() * icons.length)];
  const [coords, setCoords] = useState({
    x: Math.random() * 100,
    y: Math.random() * 100,
    scale: 0.5 + Math.random() * 1,
    rotate: Math.random() * 360
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCoords({
        x: Math.random() * 100,
        y: Math.random() * 100,
        scale: 0.5 + Math.random() * 1,
        rotate: Math.random() * 360
      });
    }, 5000 + Math.random() * 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: [0.02, 0.1, 0.02],
        left: `${coords.x}%`,
        top: `${coords.y}%`,
        scale: coords.scale,
        rotate: coords.rotate,
      }}
      transition={{ 
        duration: 15 + Math.random() * 10,
        ease: "easeInOut",
        repeat: Infinity,
        delay
      }}
      className="absolute pointer-events-none text-blue-500/20 blur-[2px]"
    >
      <Icon size={72} />
    </motion.div>
  );
};

export const HeroBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    camera.position.z = 5;

    // --- Particles (Neural Strands) ---
    const particlesCount = 8000;
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);
    const sizes = new Float32Array(particlesCount);
    const speeds = new Float32Array(particlesCount);
    const offsets = new Float32Array(particlesCount);

    const color1 = new THREE.Color('#3B82F6'); // Blue 500
    const color2 = new THREE.Color('#1D4ED8'); // Blue 700
    const color3 = new THREE.Color('#60A5FA'); // Blue 400

    for (let i = 0; i < particlesCount; i++) {
      // Create a more organic "neural wave" distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 3 + Math.random() * 4;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi) * 0.5; // Flatten slightly

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Colors - multi-tone blue
      const rand = Math.random();
      const mixedColor = rand < 0.33 ? color1 : (rand < 0.66 ? color2 : color3);
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;

      sizes[i] = Math.random() * 2 + 0.5;
      speeds[i] = 0.05 + Math.random() * 0.15;
      offsets[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // --- Animation ---
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      
      // Update particles
      const posArray = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particlesCount; i++) {
        const x = posArray[i * 3];
        const y = posArray[i * 3 + 1];
        const z = posArray[i * 3 + 2];
        
        // Complex wave motion
        posArray[i * 3 + 2] += Math.sin(elapsedTime * 0.5 + x * 0.2 + y * 0.2) * 0.005;
        posArray[i * 3] += Math.cos(elapsedTime * 0.3 + y * 0.1) * 0.002;
        posArray[i * 3 + 1] += Math.sin(elapsedTime * 0.3 + x * 0.1) * 0.002;
      }
      geometry.attributes.position.needsUpdate = true;

      particles.rotation.y = elapsedTime * 0.03;
      particles.rotation.x = elapsedTime * 0.01;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    // --- Resize Handler ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 bg-[#020617] overflow-hidden">
      <div 
        ref={containerRef} 
        className="absolute inset-0 z-10 opacity-30" 
      />
      
      {/* Floating School Icons Layer */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {[...Array(8)].map((_, i) => (
          <FloatingIcon key={i} delay={i * 2.5} />
        ))}
      </div>

      {/* Decorative Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
};

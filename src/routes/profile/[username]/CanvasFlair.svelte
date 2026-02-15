<script>
	import { onMount } from 'svelte'

	let { tier, animated = false } = $props()

	let canvas
	let ctx
	let animationFrameId
	let particles = []
	let mouse = { x: null, y: null, radius: 100 }
	let resizeObserver

	function hexToRgba (hex, alpha) {
	  const r = parseInt(hex.slice(1, 3), 16)
	  const g = parseInt(hex.slice(3, 5), 16)
	  const b = parseInt(hex.slice(5, 7), 16)
	  return `rgba(${r}, ${g}, ${b}, ${alpha})`
	}

	function createParticles () {
	  particles = []
	  let numberOfParticles = 50
	  for (let i = 0; i < numberOfParticles; i++) {
	    let size = Math.random() * 2 + 1
	    let x = Math.random() * (canvas.width - size * 2) + size
	    let y = Math.random() * (canvas.height - size * 2) + size
	    let directionX = Math.random() * 0.4 - 0.2
	    let directionY = Math.random() * 0.4 - 0.2
	    particles.push({ x, y, directionX, directionY, size })
	  }
	}

	function connectParticles () {
	  let opacityValue = 1
	  for (let a = 0; a < particles.length; a++) {
	    for (let b = a; b < particles.length; b++) {
	      let distance = Math.sqrt(
	        (particles[a].x - particles[b].x) * (particles[a].x - particles[b].x) +
					(particles[a].y - particles[b].y) * (particles[a].y - particles[b].y)
	      )

	      if (distance < 50) {
	        opacityValue = 1 - distance / 50
	        ctx.strokeStyle = hexToRgba(tier.color, opacityValue)
	        ctx.lineWidth = 1
	        ctx.beginPath()
	        ctx.moveTo(particles[a].x, particles[a].y)
	        ctx.lineTo(particles[b].x, particles[b].y)
	        ctx.stroke()
	      }
	    }
	  }
	}

	function animate () {
	  ctx.clearRect(0, 0, canvas.width, canvas.height)
	  for (let i = 0; i < particles.length; i++) {
	    let p = particles[i]
	    // Mouse interaction
	    let dx = mouse.x - p.x
	    let dy = mouse.y - p.y
	    let distance = Math.sqrt(dx * dx + dy * dy)
	    if (distance < mouse.radius) {
	      p.x -= p.directionX * 3
	      p.y -= p.directionY * 3
	    } else {
	      p.x += p.directionX
	      p.y += p.directionY
	    }
			
	    // Wall collision
	    if (p.x < 0 || p.x > canvas.width) p.directionX *= -1
	    if (p.y < 0 || p.y > canvas.height) p.directionY *= -1
			
	    ctx.fillStyle = hexToRgba(tier.color, 0.5)
	    ctx.beginPath()
	    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
	    ctx.fill()
	  }
	  connectParticles()
	  animationFrameId = requestAnimationFrame(animate)
	}

	onMount(() => {
	  if (!animated) return

	  ctx = canvas.getContext('2d')
		
	  resizeObserver = new ResizeObserver(entries => {
	    for (let entry of entries) {
	      const { width, height } = entry.contentRect
	      // Use devicePixelRatio for crisp rendering on high-DPI screens
	      canvas.width = width * window.devicePixelRatio
	      canvas.height = height * window.devicePixelRatio
	      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
	      createParticles()
	    }
	  })

	  const parentEl = canvas.parentElement
	  if (parentEl) {
	    resizeObserver.observe(parentEl)

	    parentEl.addEventListener('mousemove', (event) => {
	      const rect = canvas.getBoundingClientRect()
	      mouse.x = event.clientX - rect.left
	      mouse.y = event.clientY - rect.top
	    })

	    parentEl.addEventListener('mouseleave', () => {
	      mouse.x = null
	      mouse.y = null
	    })
	  }

	  animate()
		
	  return () => {
	    cancelAnimationFrame(animationFrameId)
	    if (resizeObserver && parentEl) {
	      resizeObserver.unobserve(parentEl)
	    }
	  }
	})

</script>

<canvas bind:this={canvas}></canvas>

<style>
	canvas {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 0;
		pointer-events: none;
	}
</style>
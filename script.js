    // --- Slide Navigator ---
    const slides = [...document.querySelectorAll('.slide')];
    let idx = 0;
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    function show(i){
      idx = Math.max(0, Math.min(slides.length-1, i));
      slides.forEach((s, k)=> s.classList.toggle('active', k===idx));
      prevBtn.disabled = idx===0; nextBtn.disabled = idx===slides.length-1;
    }
    prevBtn.onclick = ()=> show(idx-1);
    nextBtn.onclick = ()=> show(idx+1);
    document.addEventListener('keydown', (e)=>{
      if(e.key==='ArrowLeft') show(idx-1);
      if(e.key==='ArrowRight') show(idx+1);
    });

    // === Fisika constants ===
    const h = 6.626e-34;   // Planck (J·s)
    const c = 3e8;         // speed of light (m/s)
    const k = 1.381e-23;   // Boltzmann (J/K)
    const b_wien = 2.898e-3; // Wien (m·K)

    // --- DOM ---
    const slider = document.getElementById('tempSlider');
    const tempValue = document.getElementById('tempValue');
    const lambdaMaxDisplay = document.getElementById('lambdaMax');
    const totalIntensityDisplay = document.getElementById('totalIntensity');
    const colorBox = document.getElementById('colorBox');
    const resetBtn = document.getElementById('resetBtn');
    const playBtn = document.getElementById('playBtn');

    // --- Canvas Spectrum ---
    const spectrumCanvas = document.getElementById('spectrumCanvas');
    const sctx = spectrumCanvas.getContext('2d');

    // --- Canvas Blackbody + Flame ---
    const bbCanvas = document.getElementById('bbCanvas');
    const bctx = bbCanvas.getContext('2d');

    // === Planck Law ===
    function planckLaw(wavelength, T){
      const a = 2 * h * c * c;
      const b = (h * c) / (wavelength * k * T);
      return a / (Math.pow(wavelength,5) * (Math.exp(b) - 1));
    }

    // === Wavelength → RGB (approx) ===
    function wavelengthToRGB(wavelength_m){
      let wl = wavelength_m * 1e9; // m→nm if number, else assume already nm
      if (wavelength_m > 100) wl = wavelength_m; // guard: if caller passed nm
      let R=0,G=0,B=0;
      if (wl>=380 && wl<440){ R=-(wl-440)/(440-380); G=0; B=1; }
      else if (wl>=440 && wl<490){ R=0; G=(wl-440)/(490-440); B=1; }
      else if (wl>=490 && wl<510){ R=0; G=1; B=-(wl-510)/(510-490); }
      else if (wl>=510 && wl<580){ R=(wl-510)/(580-510); G=1; B=0; }
      else if (wl>=580 && wl<645){ R=1; G=-(wl-645)/(645-580); B=0; }
      else if (wl>=645 && wl<=780){ R=1; G=0; B=0; }
      const gamma=0.8; R=Math.pow(Math.max(R,0),gamma); G=Math.pow(Math.max(G,0),gamma); B=Math.pow(Math.max(B,0),gamma);
      return `rgb(${Math.round(R*255)},${Math.round(G*255)},${Math.round(B*255)})`;
    }

    // === Draw Spectrum & Info ===
    function drawSpectrum(T){
      const wlMin=380e-9, wlMax=780e-9, steps=600;
      let intensities=[], wavelengths=[], totalIntensity=0;

      for(let i=0;i<=steps;i++){
        const wl = wlMin + (i/steps)*(wlMax-wlMin);
        const I = planckLaw(wl,T);
        wavelengths.push(wl); intensities.push(I); totalIntensity += I;
      }

      const Imax = Math.max(...intensities);
      const scaleX = spectrumCanvas.width/steps;
      const scaleY = (spectrumCanvas.height-60)/Imax;

      // Background gradient (visible spectrum)
      let grad = sctx.createLinearGradient(0,0,spectrumCanvas.width,0);
      for(let i=0;i<=steps;i++){ grad.addColorStop(i/steps, wavelengthToRGB(wavelengths[i])); }
      sctx.fillStyle = grad; sctx.fillRect(0,0,spectrumCanvas.width,spectrumCanvas.height);

      // Axes baseline
      sctx.beginPath();
      sctx.moveTo(0, spectrumCanvas.height-40);
      sctx.lineTo(spectrumCanvas.width, spectrumCanvas.height-40);
      sctx.strokeStyle = "#333"; sctx.lineWidth = 1.2; sctx.stroke();

      // Curve
      sctx.beginPath();
      for(let i=0;i<=steps;i++){
        const x = i*scaleX;
        const y = spectrumCanvas.height - intensities[i]*scaleY - 40;
        if(i===0) sctx.moveTo(x,y); else sctx.lineTo(x,y);
      }
      sctx.strokeStyle = "black"; sctx.lineWidth = 2; sctx.stroke();

      // X labels
      sctx.fillStyle="#000"; sctx.font="14px system-ui,Arial";
      sctx.fillText("380 nm", 6, spectrumCanvas.height-20);
      sctx.fillText("780 nm", spectrumCanvas.width-70, spectrumCanvas.height-20);
      sctx.fillText("Panjang Gelombang (nm)", spectrumCanvas.width/2-100, spectrumCanvas.height-6);

      // Y label
      sctx.save(); sctx.translate(16, spectrumCanvas.height/2); sctx.rotate(-Math.PI/2);
      sctx.fillText("Intensitas Relatif", 0, 0); sctx.restore();

      // λmax line
      const lambdaMax = b_wien / T;
      if(lambdaMax>=wlMin && lambdaMax<=wlMax){
        const xPeak = ((lambdaMax - wlMin)/(wlMax - wlMin)) * spectrumCanvas.width;
        sctx.beginPath(); sctx.setLineDash([6,5]);
        sctx.moveTo(xPeak, spectrumCanvas.height-40); sctx.lineTo(xPeak, 0);
        sctx.strokeStyle = "red"; sctx.lineWidth = 1.5; sctx.stroke(); sctx.setLineDash([]);
        sctx.fillStyle="red"; sctx.fillText(`${Math.round(lambdaMax*1e9)} nm`, xPeak-24, 18);
      }

      // Info panel
      lambdaMaxDisplay.textContent = Math.round((b_wien/T)*1e9);
      totalIntensityDisplay.textContent = Math.round(totalIntensity/1e13);

      // colorBox = gradient ±50 nm around λmax
      let lambdaMaxNm = (b_wien/T)*1e9;
      const span = 50;
      const left = Math.max(380, Math.round(lambdaMaxNm - span));
      const right = Math.min(780, Math.round(lambdaMaxNm + span));
      let stops=[];
      for(let nm=left; nm<=right; nm+=1){
        stops.push(wavelengthToRGB(nm));
      }
      colorBox.style.background = `linear-gradient(90deg, ${stops.join(',')})`;

      // also update blackbody visual
      drawBlackBody(T);
    }

    // === Blackbody + Flame Animation ===
    const flameParticles = [];
    function makeParticle(T){
      const cx = bbCanvas.width/2, baseY = bbCanvas.height*0.68;
      const spread = 40 + (T-1000)/9000*60; // wider when hotter
      const px = cx + (Math.random()*2-1)*spread*0.9;
      const py = baseY + Math.random()*10;
      const vy = - (1.2 + Math.random()*1.6) * (0.8 + (T-1000)/9000*1.3);
      const life = 40 + Math.random()*50;
      const size = 3 + Math.random()*5 * (0.7 + (T-1000)/9000*0.8);
      return {x:px, y:py, vy, life, age:0, size};
    }

    function drawBlackBody(T){
      const cx = bbCanvas.width/2, cy = bbCanvas.height*0.48, R = 60;
      const lambdaMax = b_wien / T;
      const color = wavelengthToRGB(lambdaMax); // glow tint

      // clear
      bctx.clearRect(0,0,bbCanvas.width,bbCanvas.height);

      // subtle background vignette
      const vg = bctx.createRadialGradient(cx, cy, R*0.6, cx, cy, R*3.6);
      vg.addColorStop(0, "rgba(255,255,255,.03)");
      vg.addColorStop(1, "rgba(0,0,0,0)");
      bctx.fillStyle = vg; bctx.fillRect(0,0,bbCanvas.width,bbCanvas.height);

      // glow intensity scales with T (not physical SB-law, just pleasant mapping)
      const glowStrength = 0.35 + (T-1000)/9000*0.75;

      // outer glow
      const glow = bctx.createRadialGradient(cx, cy, R*0.8, cx, cy, R*3.2);
      glow.addColorStop(0, color);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      bctx.globalAlpha = glowStrength;
      bctx.fillStyle = glow;
      bctx.fillRect(0,0,bbCanvas.width,bbCanvas.height);
      bctx.globalAlpha = 1;

      // body (black disk)
      bctx.beginPath();
      bctx.arc(cx, cy, R, 0, Math.PI*2);
      bctx.fillStyle = "#000"; bctx.fill();

      // rim hot edge (thin)
      const rim = bctx.createRadialGradient(cx, cy, R*0.7, cx, cy, R*1.05);
      rim.addColorStop(0, "rgba(0,0,0,0)");
      rim.addColorStop(1, color);
      bctx.globalAlpha = 0.6 + glowStrength*0.25;
      bctx.fillStyle = rim;
      bctx.beginPath(); bctx.arc(cx, cy, R*1.06, 0, Math.PI*2); bctx.fill();
      bctx.globalAlpha = 1;

      // base “burner”
      const baseY = bbCanvas.height*0.7;
      bctx.fillStyle = "rgba(20,25,35,.95)";
      bctx.fillRect(cx-90, baseY+24, 180, 10);
      const baseGrad = bctx.createLinearGradient(cx, baseY+20, cx, baseY-10);
      baseGrad.addColorStop(0, "rgba(20,25,35,0)");
      baseGrad.addColorStop(1, "rgba(80,90,110,.5)");
      bctx.fillStyle = baseGrad;
      bctx.fillRect(cx-95, baseY-10, 190, 40);

      // flames (particles)
      // target particle count based on T
      const target = Math.floor(90 + (T-1000)/9000 * 220);
      while(flameParticles.length < target){ flameParticles.push(makeParticle(T)); }
      while(flameParticles.length > target){ flameParticles.pop(); }

      for(let p of flameParticles){
        p.age++; p.y += p.vy; // rise
        // fade
        const t = p.age / p.life;
        const alpha = Math.max(0, 1 - t);
        // flame color from red/orange to λmax tint
        const hotColor = wavelengthToRGB(Math.max(500, Math.min(650, (b_wien/T)*1e9)));
        bctx.globalAlpha = alpha * (0.5 + (T-1000)/9000*0.6);
        // core
        bctx.beginPath();
        bctx.fillStyle = hotColor;
        bctx.ellipse(p.x, p.y, p.size*0.7, p.size*1.2, 0, 0, Math.PI*2);
        bctx.fill();
        // soft aura
        const fg = bctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size*2.2);
        fg.addColorStop(0, hotColor);
        fg.addColorStop(1, "rgba(0,0,0,0)");
        bctx.fillStyle = fg;
        bctx.beginPath();
        bctx.arc(p.x, p.y, p.size*2.2, 0, Math.PI*2); bctx.fill();
        bctx.globalAlpha = 1;

        if(p.age > p.life){ // recycle
          const i = flameParticles.indexOf(p);
          if(i>-1){ flameParticles.splice(i,1); }
          flameParticles.push(makeParticle(T));
        }
      }
    }

    // === Controls & Loop ===
    function renderAll(){
      const T = parseInt(slider.value);
      tempValue.textContent = T;
      drawSpectrum(T);
    }

    slider.addEventListener('input', renderAll);
    resetBtn.addEventListener('click', ()=>{
      slider.value = 5000; renderAll();
    });

    // autoplay (heating/cooling)
    let playing = false, dir = +1, raf;
    function tick(){
      if(!playing) return;
      let T = parseInt(slider.value);
      T += dir*40;
      if(T>=10000){ T=10000; dir=-1; }
      if(T<=1000){ T=1000; dir=+1; }
      slider.value = T;
      renderAll();
      raf = requestAnimationFrame(tick);
    }
    playBtn.addEventListener('click', ()=>{
      playing = !playing;
      playBtn.textContent = playing ? '⏸ Pause' : '▶ Play';
      if(playing){ cancelAnimationFrame(raf); tick(); }
      else cancelAnimationFrame(raf);
    });

    // init
    renderAll();
    show(0);

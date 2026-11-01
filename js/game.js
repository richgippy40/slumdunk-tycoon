(() => {
  'use strict';
  const price = 8900,
    target = 350000,
    limit = 300;
  const recipe = [
    ['bottom', '아랫번'],
    ['sauce', '기본소스'],
    ['pickle', '피클'],
    ['meat', '소고기 패티'],
    ['cheese', '치즈'],
    ['onion', '카라멜어니언'],
    ['top', '윗번'],
  ];
  let playing = false,
    ended = false,
    time = limit,
    last = 0,
    cooking = false,
    cookStart = 0,
    pattyState = 'raw',
    pattyReady = false,
    assembled = [],
    finished = false,
    sales = 0,
    orders = 0;
  let available = null;
  const $ = (id) => document.getElementById(id);
  const cash = (n) => n.toLocaleString('ko-KR') + '원';
  $('recipelist').textContent = recipe.map((x, i) => `${i + 1}. ${x[1]}`).join('  →  ');
  $('target').textContent = cash(target);
  function notice(msg) {
    $('notice').textContent = msg;
  }
  function setCookVisual() {
    let s = pattyState;
    $('patty').src =
      'assets/' +
      { raw: 'beef_raw', cooking: 'beef_cooking', ready: 'beef_ready', burnt: 'beef_burnt' }[s] +
      '.webp';
    $('cook').textContent = cooking
      ? '패티 꺼내기'
      : s === 'ready'
        ? '조리 완료'
        : s === 'burnt'
          ? '탄 패티 버리기'
          : '조리 시작';
    $('cook').disabled = s === 'ready';
    $('cookstate').textContent = cooking
      ? '초록색 구간에서 꺼내세요!'
      : s === 'ready'
        ? '성공! 조립대의 패티를 누르세요'
        : s === 'burnt'
          ? '패티가 탔어요. 다시 도전!'
          : '조리 시작을 눌러주세요';
  }
  function render() {
    let stack = $('stack');
    stack.innerHTML = '';
    const styleMap = {
      bottom: ['bun_bottom', 0, 43],
      sauce: [null, 27, 15],
      pickle: ['pickle', 34, 23],
      meat: ['beef_ready', 42, 34],
      cheese: ['cheese', 65, 20],
      onion: [null, 76, 19],
      top: ['bun_top', 85, 57],
    };
    assembled.forEach(([key, name]) => {
      const [src, y, h] = styleMap[key];
      const el = document.createElement(src ? 'img' : 'div');
      el.className =
        'layer ' + key + (key === 'sauce' ? ' sauce-art' : key === 'onion' ? ' onion-art' : '');
      el.style.bottom = y + 'px';
      el.style.height = h + 'px';
      if (src) {
        el.src = 'assets/' + src + '.webp';
        el.alt = name;
        el.onerror = () => {
          el.style.visibility = 'hidden';
          notice(name + ' 이미지 로딩 오류: 파일을 확인해 주세요.');
        };
      }
      stack.append(el);
    });
    $('step').textContent = assembled.length + ' / ' + recipe.length;
    $('ingredients').innerHTML = '';
    recipe.forEach(([key, label], idx) => {
      let b = document.createElement('button');
      b.className = 'ingredientbtn' + (idx < assembled.length ? ' done' : '');
      b.textContent = (idx < assembled.length ? '✓ ' : '') + label;
      b.disabled =
        !playing || finished || idx !== assembled.length || (key === 'meat' && !pattyReady);
      b.addEventListener('click', () => {
        assembled.push([key, label]);
        if (key === 'meat') {
          pattyReady = false;
          pattyState = 'raw';
          setCookVisual();
        }
        render();
        notice(label + ' 추가!');
      });
      $('ingredients').append(b);
    });
    $('finish').disabled = !playing || finished || assembled.length !== recipe.length;
    $('serve').disabled = !playing || !finished;
    $('readycount').textContent = '완성 버거 ' + (finished ? 1 : 0) + '개';
    $('servestate').textContent = finished
      ? '판매 버튼을 눌러 매출을 올리세요'
      : '판매할 버거를 준비하세요';
    $('sales').textContent = cash(sales);
    $('salesbar').style.width = Math.min(100, (sales / target) * 100) + '%';
    $('orderno').textContent = '주문 #' + (orders + 1);
  }
  function updateGauge(p) {
    const pct = Math.max(0, Math.min(100, Math.round(p * 100)));
    $('cookpercent').textContent = pct + '%';
    $('cookzone').textContent = pct < 38 ? '설익음' : pct < 76 ? '적정 조리' : '탐';
    $('cookzone').style.color = pct < 38 ? '#c44f4d' : pct < 76 ? '#168a4c' : '#25232a';
  }
  $('cook').onclick = () => {
    if (!playing || ended) return;
    if (pattyState === 'burnt') {
      pattyState = 'raw';
      cooking = false;
      setCookVisual();
      return;
    }
    if (pattyState === 'ready') {
      return;
    }
    if (!cooking) {
      cooking = true;
      cookStart = performance.now();
      pattyState = 'cooking';
      setCookVisual();
      return;
    }
    const progress = (performance.now() - cookStart) / 7200;
    cooking = false;
    if (progress >= 0.38 && progress < 0.76) {
      pattyState = 'ready';
      pattyReady = true;
      notice('완벽하게 구운 패티! 이제 조립해요.');
    } else if (progress >= 0.76) {
      pattyState = 'burnt';
      pattyReady = false;
      notice('패티가 탔어요. 다시 구워주세요.');
    } else {
      pattyState = 'raw';
      notice('아직 설익었어요. 다시 구워주세요.');
    }
    setCookVisual();
  };
  $('undo').onclick = () => {
    if (!playing || finished || assembled.length === 0) return;
    const [key] = assembled.pop();
    if (key === 'meat') {
      pattyState = 'ready';
      pattyReady = true;
      setCookVisual();
    }
    render();
    notice('마지막 재료를 취소했어요');
  };
  $('finish').onclick = () => {
    if (assembled.length !== recipe.length) return;
    finished = true;
    render();
    notice('버거 완성! 판매해서 매출을 올리세요.');
  };
  $('serve').onclick = () => {
    if (!finished || !playing) return;
    sales += price;
    orders++;
    finished = false;
    assembled = [];
    pattyReady = false;
    pattyState = 'raw';
    cooking = false;
    $('needle').style.left = '0%';
    updateGauge(0);
    setCookVisual();
    render();
    const pop = document.createElement('div');
    pop.className = 'floatmoney';
    pop.textContent = '+' + cash(price);
    document.body.append(pop);
    setTimeout(() => pop.remove(), 1150);
    $('customername').textContent = '손님 ' + (orders + 1);
    $('person').textContent = ['🧑', '👩', '👨', '👩‍🦱', '👨‍🦰'][orders % 5];
    notice('판매 성공! +' + cash(price) + ' 매출 발생');
    if (sales >= target) {
      end(true);
    }
  };
  $('recipe').onclick = () => {
    $('recipeModal').classList.add('show');
  };
  $('closeRecipe').onclick = () => {
    $('recipeModal').classList.remove('show');
  };
  $('start').onclick = () => {
    $('intro').classList.remove('show');
    playing = true;
    last = performance.now();
    render();
    requestAnimationFrame(tick);
  };
  function end(win) {
    if (ended) return;
    ended = true;
    playing = false;
    cooking = false;
    $('resulttitle').textContent = win ? 'STAGE CLEAR!' : 'TIME OVER';
    $('resultdesc').textContent = win
      ? '목표 매출 달성! 첫 영업 성공!'
      : '목표 매출에 도달하지 못했어요. 다시 도전하세요!';
    $('resultmoney').textContent = cash(sales);
    $('resultsmall').textContent =
      '판매 ' + orders + '건 · ' + Math.floor(limit - time) + '초 경과';
    $('result').classList.add('show');
  }
  function tick(now) {
    if (ended) return;
    const dt = Math.min(0.2, (now - last) / 1000);
    last = now;
    time = Math.max(0, time - dt);
    const sec = Math.ceil(time);
    $('time').textContent =
      String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
    if (cooking) {
      let p = Math.min(1, (now - cookStart) / 7200);
      $('needle').style.left = 'calc(' + p * 100 + '% - 3px)';
      updateGauge(p);
      if (p >= 1) {
        cooking = false;
        pattyState = 'burnt';
        pattyReady = false;
        setCookVisual();
        notice('패티를 태웠어요! 다시 시작하세요.');
      }
    }
    if (time <= 0) {
      end(false);
      return;
    }
    requestAnimationFrame(tick);
  }
  setCookVisual();
  updateGauge(0);
  render();
})();

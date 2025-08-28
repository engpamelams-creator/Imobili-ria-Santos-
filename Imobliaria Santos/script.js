// ========= Utilitários =========
const $  = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

// ========= Ano no rodapé =========
(() => {
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
})();

// ========= Header sticky + parallax leve + back-to-top =========
(() => {
  const header   = $('.site-header');
  const parallax = $('.parallax');
  const toTopBtn = $('#backToTop');

  const onScroll = () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 8);
    if (parallax) {
      const t = Math.min(20, window.scrollY / 15);
      parallax.style.transform = `translateY(${t}px)`;
    }
    if (toTopBtn) toTopBtn.classList.toggle('show', window.scrollY > 400);
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  toTopBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

// ========= Menu ativo por seção =========
(() => {
  const ids = ['sobre','servicos','corretores','contato'];
  const sections = ids.map(id => document.getElementById(id)).filter(Boolean);
  const navLinks = $$('.main-nav a');

  if (!sections.length || !navLinks.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => {
        const isActive = a.getAttribute('href') === '#' + e.target.id;
        a.classList.toggle('active', isActive);
        if (isActive) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

  sections.forEach(s => io.observe(s));
})();

// ========= Menu mobile =========
(() => {
  const toggle = $('.nav-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const isOpen = document.documentElement.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  $$('.main-nav a').forEach(a => a.addEventListener('click', () => {
    document.documentElement.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded','false');
  }));
})();

// ========= Reveal on scroll =========
(() => {
  $$('.reveal').forEach(el => {
    const ro = new IntersectionObserver(([entry], obs) => {
      if (entry.isIntersecting) { el.classList.add('revealed'); obs.unobserve(el); }
    }, { threshold: .12 });
    ro.observe(el);
  });
})();

// ========= Theme toggle (claro/escuro) =========
(() => {
  const themeToggle = $('#themeToggle');
  if (!themeToggle) return;

  const applyTheme = (t) => document.documentElement.setAttribute('data-theme', t);
  applyTheme(localStorage.getItem('theme') || 'light');

  themeToggle.addEventListener('click', () => {
    const t = (document.documentElement.getAttribute('data-theme') === 'dark') ? 'light' : 'dark';
    applyTheme(t);
    localStorage.setItem('theme', t);
  });
})();

// ========= Formulário: máscara, validação e AJAX =========
(() => {
  const form = $('#contactForm');
  if (!form) return;

  const tel      = $('#telefone');
  const email    = $('#email');
  const sendBtn  = $('#sendBtn');
  const alertBox = $('#formAlert');

  // Máscara telefone BR
  tel?.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g,'').slice(0,11);
    if (v.length > 10)      v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    else if (v.length > 6)  v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    else if (v.length > 2)  v = v.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
    else if (v.length > 0)  v = v.replace(/^(\d{0,2}).*/, '($1');
    e.target.value = v;
  });

  // Validação leve
  const isEmail = (v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const requiredSelectors = ['#nome','#telefone','#mensagem','#consent'];

  function validate(){
    let ok = true;
    requiredSelectors.forEach(sel => {
      const el = $(sel);
      if (!el) return;
      const valid = (el.type === 'checkbox') ? el.checked : el.value.trim() !== '';
      el.classList.toggle('invalid', !valid);
      ok = ok && valid;
    });
    if (email && !isEmail(email.value.trim())) { email.classList.add('invalid'); ok = false; }
    else email?.classList.remove('invalid');
    return ok;
  }

  // Envio AJAX → contact.php
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!validate()) { alertBox.textContent = 'Confira os campos destacados.'; return; }

    alertBox.textContent = 'Enviando...';
    sendBtn?.classList.add('loading');
    sendBtn && (sendBtn.disabled = true);

    try{
      const fd = new FormData(form);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);

      const res = await fetch('contact.php', { method:'POST', body: fd, signal: ctrl.signal });
      clearTimeout(t);
      const txt = await res.text();

      if (res.ok){
        form.reset();
        alertBox.textContent = txt || 'Obrigado! Recebemos sua mensagem.';
      } else {
        alertBox.textContent = txt || 'Não foi possível enviar agora.';
      }
    } catch(err){
      alertBox.textContent = 'Falha de rede. Tente novamente.';
    } finally{
      sendBtn?.classList.remove('loading');
      sendBtn && (sendBtn.disabled = false);
    }
  });
})();

// ========= Sanidade: log simples para saber que carregou =========
console.info('scripts.js carregado ✓');

// /api/contact.js
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { nome, telefone, email, mensagem, website } = req.body || {};

  // Honeypot: se robô preencheu, finja sucesso
  if (website) {
    return res.status(200).json({ message: 'Mensagem enviada com sucesso!' });
  }

  if (!nome || !telefone || !mensagem) {
    return res.status(400).json({ message: 'Preencha nome, telefone e mensagem.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_PORT) === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const to = process.env.CONTACT_TO_EMAIL;
    if (!to) {
      return res.status(500).json({ message: 'CONTACT_TO_EMAIL não configurado.' });
    }

    await transporter.sendMail({
      from: `Site Imobiliária Santos <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      replyTo: email || undefined,
      subject: `Contato do site — ${nome}`,
      text: `Nome: ${nome}\nTelefone: ${telefone}\nE-mail: ${email || '—'}\n\nMensagem:\n${mensagem}`,
    });

    return res.status(200).json({ message: 'Mensagem enviada com sucesso!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao enviar. Tente novamente mais tarde.' });
  }
};

// Tradução do site (PT-BR / EN / ES).
// O texto original em português fica no HTML e no JavaScript; este arquivo troca cada
// texto pelo do idioma escolhido, inclusive os criados depois pelas simulações.
// Chaves com {0}, {1}... são padrões (as partes variáveis também são traduzidas).
// Elementos com data-t="id" trocam o HTML inteiro pela chave "@id".
(function () {
    const DIC = {};
    const PADROES = [];
    const IDX = { en: 0, es: 1 };
    const LANG_HTML = { pt: 'pt-BR', en: 'en', es: 'es' };
    const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
    const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    function add(obj) {
        for (const [pt, tr] of Object.entries(obj)) {
            const k = pt.startsWith('@') ? pt : norm(pt);
            if (!k.startsWith('@') && /\{\d\}/.test(k)) {
                const ordem = [];
                const re = '^' + k.split(/(\{\d\})/).map((p) => {
                    const m = p.match(/^\{(\d)\}$/);
                    if (m) { ordem.push(+m[1]); return '(.+?)'; }
                    return escRe(p);
                }).join('') + '$';
                PADROES.push({ pt: k, re: new RegExp(re), ordem, tr, lit: k.replace(/\{\d\}/g, '').length });
            } else {
                DIC[k] = tr;
            }
        }
        PADROES.sort((a, b) => b.lit - a.lit);
    }

    let lang = 'pt';
    try { lang = localStorage.getItem('idioma') || ''; } catch (e) { lang = ''; }
    if (!(lang in IDX) && lang !== 'pt') {
        const nav = (navigator.languages || [navigator.language || 'pt']).map((l) => l.toLowerCase());
        lang = nav[0].startsWith('pt') ? 'pt' : nav[0].startsWith('es') ? 'es' : 'en';
    }

    // Devolve a tradução de um texto já normalizado, ou null se não houver
    function traduzir(s, prof) {
        prof = prof || 0;
        if (lang === 'pt' || !s || !/[A-Za-zÀ-ú]/.test(s)) return null;
        const i = IDX[lang];
        if (DIC[s]) return DIC[s][i];
        if (prof > 3) return null;
        for (const p of PADROES) {
            const m = s.match(p.re);
            if (!m) continue;
            const grupos = m.slice(1);
            let algum = false;
            const out = p.tr[i].replace(/\{(\d)\}/g, (_, n) => {
                const g = grupos[p.ordem.indexOf(+n)];
                const t = traduzir(norm(g), prof + 1);
                if (t !== null) algum = true;
                return t !== null ? t : g;
            });
            if (algum || p.tr[i] !== p.pt) return out;
        }
        for (const sep of [', ', ' · ']) {
            if (!s.includes(sep)) continue;
            const partes = s.split(sep).map((x) => traduzir(x, prof + 1));
            if (partes.every((x) => x !== null)) return partes.join(sep);
        }
        return null;
    }

    // Para o JavaScript das páginas (canvas, confirm, prompt, alert)
    function t(s) {
        s = String(s);
        if (s.includes('\n')) return s.split('\n').map(t).join('\n');
        const k = norm(s);
        const r = traduzir(k);
        if (r === null) return s;
        return s.match(/^\s*/)[0] + r + s.match(/\s*$/)[0];
    }

    // ---------- Aplicação no DOM ----------
    const ORIG = new WeakMap();
    const ATTR = new WeakMap();
    const HTML = new WeakMap();
    const ATTRS = ['placeholder', 'title', 'aria-label'];
    const PULAR = 'script,style,textarea,[data-t],.idioma';

    function aplicarTexto(n) {
        let o = ORIG.get(n);
        if (o === undefined) { o = n.nodeValue; ORIG.set(n, o); }
        const novo = t(o);
        if (n.nodeValue !== novo) n.nodeValue = novo;
    }
    function aplicarAttr(el) {
        let rec = ATTR.get(el);
        if (!rec) { rec = {}; ATTR.set(el, rec); }
        for (const a of ATTRS) {
            if (!el.hasAttribute(a)) continue;
            const atual = el.getAttribute(a);
            if (!rec[a] || atual !== rec[a][1]) rec[a] = [atual, null];
            const novo = t(rec[a][0]);
            rec[a][1] = novo;
            if (atual !== novo) el.setAttribute(a, novo);
        }
    }
    function aplicarHtml(el) {
        if (!HTML.has(el)) HTML.set(el, el.innerHTML);
        const id = '@' + el.getAttribute('data-t');
        const novo = lang !== 'pt' && DIC[id] ? DIC[id][IDX[lang]] : HTML.get(el);
        if (el.innerHTML !== novo) el.innerHTML = novo;
    }
    function percorrer(no) {
        if (no.nodeType === 3) { aplicarTexto(no); return; }
        if (no.nodeType !== 1) return;
        if (no.matches('script,style,.idioma')) return;
        if (no.matches('textarea')) { aplicarAttr(no); return; }
        if (no.hasAttribute('data-t')) { aplicarHtml(no); return; }
        aplicarAttr(no);
        for (const f of no.childNodes) percorrer(f);
    }
    function dentroDePulo(no) {
        const p = no.nodeType === 1 ? no.parentElement : no.parentNode;
        return p && p.nodeType === 1 && !!p.closest(PULAR);
    }

    let tituloOrig = null;
    function aplicarTudo() {
        if (tituloOrig === null) tituloOrig = document.title;
        document.title = t(tituloOrig);
        document.documentElement.lang = LANG_HTML[lang];
        percorrer(document.body);
        document.querySelectorAll('.idioma button').forEach((b) => b.classList.toggle('on', b.dataset.l === lang));
    }

    function definir(l) {
        if (l !== 'pt' && !(l in IDX)) return;
        lang = l;
        try { localStorage.setItem('idioma', l); } catch (e) { /* sem armazenamento */ }
        aplicarTudo();
        window.dispatchEvent(new CustomEvent('idioma', { detail: l }));
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-idioma]').forEach((c) => {
            c.classList.add('idioma');
            c.innerHTML = ['pt', 'en', 'es'].map((l) => `<button type="button" data-l="${l}" title="${{ pt: 'Português', en: 'English', es: 'Español' }[l]}">${l.toUpperCase()}</button>`).join('');
            c.querySelectorAll('button').forEach((b) => { b.onclick = () => definir(b.dataset.l); });
        });
        aplicarTudo();
        new MutationObserver((muts) => {
            for (const m of muts) {
                if (m.type === 'childList') {
                    m.addedNodes.forEach((n) => { if (!dentroDePulo(n)) percorrer(n); });
                } else if (m.type === 'attributes' && !m.target.closest(PULAR)) {
                    const rec = ATTR.get(m.target);
                    const v = m.target.getAttribute(m.attributeName);
                    if (!rec || !rec[m.attributeName] || rec[m.attributeName][1] !== v) aplicarAttr(m.target);
                }
            }
        }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ATTRS });
    });

    window.I18N = { add, t, definir, get lang() { return lang; } };
    window.t = t;

    // ---------- Textos comuns (portfólio, obrigado e páginas de projeto) ----------
    add({
        'Gabriel Menge | Desenvolvedor Full Stack': ['Gabriel Menge | Full Stack Developer', 'Gabriel Menge | Desarrollador Full Stack'],
        'Desenvolvedor Full Stack': ['Full Stack Developer', 'Desarrollador Full Stack'],
        'Habilidades': ['Skills', 'Habilidades'],
        'Missão': ['Mission', 'Misión'],
        'Meus Projetos': ['My Projects', 'Mis Proyectos'],
        'Contato': ['Contact', 'Contacto'],
        'Informações': ['Info', 'Información'],
        'Tecnologias & Ferramentas': ['Technologies & Tools', 'Tecnologías y Herramientas'],
        '@missao': ['I build custom software and automation routines that eliminate manual processes and unlock your business\'s operational efficiency. My focus is turning operational problems into practical, integrated and scalable technology solutions.',
                    'Desarrollo software y rutinas de automatización a medida para eliminar procesos manuales y desbloquear la eficiencia operativa de tu negocio. Mi enfoque es transformar problemas operativos en soluciones tecnológicas prácticas, integradas y escalables.'],
        'Clique em um projeto para ver a prévia interativa e o repositório:': ['Click a project to see the interactive preview and the repository:', 'Haz clic en un proyecto para ver la vista previa interactiva y el repositorio:'],
        'Calculadora Solar': ['Solar Calculator', 'Calculadora Solar'],
        'Produção ao vivo • C++ / Qt': ['Live production • C++ / Qt', 'Producción en vivo • C++ / Qt'],
        'Gerenciamento • Python': ['Management • Python', 'Gestión • Python'],
        'Automação • Python': ['Automation • Python', 'Automatización • Python'],
        'Entre em Contato': ['Get in Touch', 'Ponte en Contacto'],
        'Seu Nome': ['Your Name', 'Tu Nombre'],
        'Seu Email': ['Your Email', 'Tu Email'],
        'Sua Mensagem': ['Your Message', 'Tu Mensaje'],
        'Enviar Mensagem': ['Send Message', 'Enviar Mensaje'],
        'Enviando...': ['Sending...', 'Enviando...'],
        'Ocorreu um erro ao enviar a mensagem. Tente novamente.': ['There was an error sending the message. Please try again.', 'Ocurrió un error al enviar el mensaje. Inténtalo de nuevo.'],
        'Ocorreu um erro de conexão. Tente novamente.': ['A connection error occurred. Please try again.', 'Ocurrió un error de conexión. Inténtalo de nuevo.'],
        'Conecte-se Comigo': ['Connect with Me', 'Conéctate Conmigo'],
        '© 2026 Gabriel Menge. Todos os direitos reservados.': ['© 2026 Gabriel Menge. All rights reserved.', '© 2026 Gabriel Menge. Todos los derechos reservados.'],
        'Mensagem Enviada | Gabriel Menge': ['Message Sent | Gabriel Menge', 'Mensaje Enviado | Gabriel Menge'],
        'Mensagem Enviada com Sucesso!': ['Message Sent Successfully!', '¡Mensaje Enviado con Éxito!'],
        'Obrigado pelo contato. Recebi suas informações e retornarei o seu e-mail o mais breve possível.': ['Thank you for reaching out. I received your information and will reply to your email as soon as possible.', 'Gracias por el contacto. Recibí tu información y responderé a tu correo lo antes posible.'],
        'Voltar ao Site': ['Back to the Site', 'Volver al Sitio'],
        // Páginas de projeto
        'Calculadora Solar | Gabriel Menge': ['Solar Calculator | Gabriel Menge', 'Calculadora Solar | Gabriel Menge'],
        'Voltar ao portfólio': ['Back to portfolio', 'Volver al portafolio'],
        'Ver repositório': ['View repository', 'Ver repositorio'],
        'Abrir o app': ['Open the app', 'Abrir la app'],
        'Repositório privado': ['Private repository', 'Repositorio privado'],
        'Produto comercial: código fechado': ['Commercial product: closed source', 'Producto comercial: código cerrado'],
        'Experimente': ['Try it', 'Pruébalo'],
        'Recursos': ['Features', 'Funciones'],
        'Tela cheia': ['Full screen', 'Pantalla completa'],
        'Sair da tela cheia': ['Exit full screen', 'Salir de pantalla completa'],
        'No celular, use a tela cheia com o aparelho deitado.': ['On a phone, use full screen with the device turned sideways.', 'En el celular, usa la pantalla completa con el aparato acostado.'],
        'Desenvolvido por Gabriel Menge': ['Developed by Gabriel Menge', 'Desarrollado por Gabriel Menge'],
        'Desenvolvido por Gabriel Menge.': ['Developed by Gabriel Menge.', 'Desarrollado por Gabriel Menge.'],
        'Cancelar': ['Cancel', 'Cancelar'],
        'CANCELAR': ['CANCEL', 'CANCELAR'],
        'Salvar': ['Save', 'Guardar'],
        'Fechar': ['Close', 'Cerrar'],
        'Configurações': ['Settings', 'Configuración'],
        'Status': ['Status', 'Estado'],
        '[{0}] {1}': ['[{0}] {1}', '[{0}] {1}'],
    });
})();

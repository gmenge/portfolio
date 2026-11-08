// Janela das simulações: o app é desenhado num tamanho fixo (16:9) e escalado
// para caber na largura disponível. O botão ☐ e "Tela cheia" ampliam a janela.
(function () {
    const BW = 1152, BH = 648;   // tamanho base do app (16:9)

    document.querySelectorAll('.palco').forEach((palco) => {
        const app = palco.querySelector('.app');
        const janela = palco.closest('.janela');
        const barra = janela.querySelector('.janela-barra');

        function ajustar() {
            let s;
            if (janela.classList.contains('cheia')) {
                const W = window.innerWidth, H = window.innerHeight - barra.offsetHeight;
                s = Math.min(W / BW, H / BH);
                // Em telas pequenas (celular) prefere legibilidade: no mínimo 70%, com rolagem
                if (s < 0.7) s = Math.min(W / BW, 0.7);
                palco.style.width = BW * s + 'px';
                palco.style.height = BH * s + 'px';
            } else {
                palco.style.width = ''; palco.style.height = '';
                s = palco.clientWidth / BW;
            }
            app.style.transform = `scale(${s})`;
        }

        async function alternar() {
            const ligar = !janela.classList.contains('cheia');
            janela.classList.toggle('cheia', ligar);
            document.body.classList.toggle('tem-cheia', ligar);
            botao.innerHTML = ligar ? '<i class="fa-solid fa-compress"></i> Sair da tela cheia' : '<i class="fa-solid fa-expand"></i> Tela cheia';
            ajustar();
            try {
                if (ligar && document.documentElement.requestFullscreen && !document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {});
                } else if (!ligar && document.fullscreenElement) {
                    await document.exitFullscreen();
                }
            } catch (e) { /* navegador sem tela cheia (ex.: iPhone): fica só a janela ampliada */ }
            ajustar();
        }

        const botao = document.createElement('button');
        botao.className = 'botao-cheia';
        botao.innerHTML = '<i class="fa-solid fa-expand"></i> Tela cheia';
        botao.onclick = alternar;
        const pe = document.createElement('div');
        pe.className = 'pe-janela';
        pe.innerHTML = '<span class="dica-girar"><i class="fa-solid fa-rotate"></i> No celular, use a tela cheia com o aparelho deitado.</span>';
        pe.appendChild(botao);
        janela.after(pe);

        const [, max, fechar] = janela.querySelectorAll('.janela-controles span');
        max.classList.add('clicavel'); max.title = 'Tela cheia'; max.onclick = alternar;
        fechar.classList.add('clicavel'); fechar.title = 'Sair da tela cheia';
        fechar.onclick = () => { if (janela.classList.contains('cheia')) alternar(); };

        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && janela.classList.contains('cheia')) alternar();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && janela.classList.contains('cheia') && !document.fullscreenElement) alternar();
        });

        new ResizeObserver(ajustar).observe(palco);
        window.addEventListener('resize', ajustar);
        ajustar();
    });
})();

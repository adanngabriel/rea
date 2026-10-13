import { Header } from "@/components/Header";
import { ConnectCard } from "@/components/ConnectCard";
import { Logo } from "@/components/Logo";

const features = [
  {
    icon: "🔒",
    title: "Criptografia de ponta a ponta",
    text: "Seu tráfego viaja por um túnel criptografado, protegido de redes Wi-Fi públicas e de olhares curiosos.",
  },
  {
    icon: "🌍",
    title: "Servidores pelo mundo",
    text: "Escolha entre locais em vários continentes e acesse a internet como se estivesse lá.",
  },
  {
    icon: "⚡",
    title: "Rápida de verdade",
    text: "Protocolos modernos e servidores otimizados para streaming, jogos e chamadas de vídeo sem travar.",
  },
  {
    icon: "🙈",
    title: "Sem registro de atividade",
    text: "Não guardamos o histórico do que você acessa. Sua navegação é só sua.",
  },
  {
    icon: "🛑",
    title: "Kill switch automático",
    text: "Se a conexão protegida cair, o AG VPN bloqueia o tráfego até ela voltar, para nada vazar.",
  },
  {
    icon: "👆",
    title: "Um toque para conectar",
    text: "Interface simples: abra, toque e pronto. Sem configurações complicadas.",
  },
];

const platforms = [
  { name: "Windows", note: "Windows 10 ou superior" },
  { name: "macOS", note: "Apple Silicon e Intel" },
  { name: "Android", note: "Android 8 ou superior" },
  { name: "iOS", note: "iPhone e iPad" },
  { name: "Chrome", note: "Extensão de navegador" },
  { name: "Firefox", note: "Extensão de navegador" },
];

const steps = [
  { n: 1, title: "Baixe o app", text: "Instale o AG VPN no seu dispositivo ou navegador em menos de um minuto." },
  { n: 2, title: "Escolha um local", text: "Use o servidor mais rápido automaticamente ou escolha um país." },
  { n: 3, title: "Conecte-se", text: "Toque no botão e navegue com a conexão protegida." },
];

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "para sempre",
    highlight: false,
    items: ["Servidores selecionados", "Criptografia completa", "1 dispositivo", "Com anúncios no app"],
    cta: "Começar grátis",
  },
  {
    name: "Premium",
    price: "R$ 19,90",
    period: "por mês",
    highlight: true,
    items: [
      "Todos os servidores",
      "Velocidade máxima",
      "Até 10 dispositivos",
      "Sem anúncios",
      "Suporte prioritário",
    ],
    cta: "Assinar Premium",
  },
];

const faq = [
  {
    q: "O que é uma VPN?",
    a: "VPN (rede privada virtual) cria um túnel criptografado entre o seu dispositivo e um servidor. Assim, seu provedor e redes públicas não conseguem ver o que você acessa, e os sites veem o IP do servidor, não o seu.",
  },
  {
    q: "O AG VPN é realmente grátis?",
    a: "Sim. O plano Grátis não tem custo e não exige cartão. O Premium libera todos os servidores, mais dispositivos e remove os anúncios.",
  },
  {
    q: "A VPN deixa a internet mais lenta?",
    a: "Toda VPN adiciona um pequeno desvio, mas o AG VPN escolhe automaticamente o servidor mais rápido para você. Na maioria dos usos a diferença é imperceptível.",
  },
  {
    q: "Posso usar em mais de um dispositivo?",
    a: "No plano Grátis, um dispositivo por vez. No Premium, até 10 dispositivos ao mesmo tempo com a mesma conta.",
  },
  {
    q: "Usar VPN é legal?",
    a: "No Brasil e na maioria dos países, sim. Você continua responsável por respeitar as leis e os termos dos serviços que acessa.",
  },
];

export default function Home() {
  return (
    <>
      <Header />

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="badge">Nova versão 2.0 disponível</span>
              <h1>
                Sua internet, <span className="grad">privada e livre</span>.
              </h1>
              <p className="lead">
                O AG VPN criptografa sua conexão, esconde seu IP e libera o acesso a conteúdos de
                qualquer lugar do mundo — com apenas um toque.
              </p>
              <div className="hero-cta" id="download">
                <a href="#plataformas" className="btn btn-primary btn-lg">
                  Baixar grátis
                </a>
                <a href="#como-funciona" className="btn btn-ghost btn-lg">
                  Como funciona
                </a>
              </div>
              <ul className="hero-checks">
                <li>Sem cartão de crédito</li>
                <li>Sem registro de atividade</li>
                <li>Cancele quando quiser</li>
              </ul>
            </div>
            <ConnectCard />
          </div>
        </section>

        <section className="stats">
          <div className="container stats-grid">
            <div>
              <strong>50+</strong>
              <span>países</span>
            </div>
            <div>
              <strong>256-bit</strong>
              <span>criptografia AES</span>
            </div>
            <div>
              <strong>6</strong>
              <span>plataformas</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>proteção ativa</span>
            </div>
          </div>
        </section>

        <section id="recursos" className="section">
          <div className="container">
            <h2 className="section-title">Tudo o que você precisa para navegar seguro</h2>
            <p className="section-sub">Proteção completa sem complicação.</p>
            <div className="features">
              {features.map((f) => (
                <article key={f.title} className="feature">
                  <span className="feature-icon" aria-hidden="true">
                    {f.icon}
                  </span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="plataformas" className="section section-alt">
          <div className="container">
            <h2 className="section-title">Disponível onde você estiver</h2>
            <p className="section-sub">Um só cadastro protege todos os seus dispositivos.</p>
            <div className="platforms">
              {platforms.map((p) => (
                <a key={p.name} href="#" className="platform">
                  <strong>{p.name}</strong>
                  <span>{p.note}</span>
                  <em>Baixar →</em>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="section">
          <div className="container">
            <h2 className="section-title">Protegido em 3 passos</h2>
            <ol className="steps">
              {steps.map((s) => (
                <li key={s.n} className="step">
                  <span className="step-n">{s.n}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="planos" className="section section-alt">
          <div className="container">
            <h2 className="section-title">Escolha seu plano</h2>
            <p className="section-sub">Comece grátis e faça upgrade quando quiser.</p>
            <div className="plans">
              {plans.map((p) => (
                <div key={p.name} className={`plan ${p.highlight ? "plan-hl" : ""}`}>
                  {p.highlight && <span className="plan-tag">Mais popular</span>}
                  <h3>{p.name}</h3>
                  <p className="plan-price">
                    <strong>{p.price}</strong> <span>{p.period}</span>
                  </p>
                  <ul>
                    {p.items.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                  <a href="#download" className={`btn ${p.highlight ? "btn-primary" : "btn-ghost"}`}>
                    {p.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="section">
          <div className="container narrow">
            <h2 className="section-title">Perguntas frequentes</h2>
            <div className="faq">
              {faq.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-band">
          <div className="container cta-inner">
            <h2>Pronto para navegar com privacidade?</h2>
            <a href="#download" className="btn btn-white btn-lg">
              Baixar AG VPN grátis
            </a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <Logo />
            <p>Privacidade e liberdade na internet para todos.</p>
          </div>
          <div>
            <h4>Produto</h4>
            <a href="#recursos">Recursos</a>
            <a href="#plataformas">Downloads</a>
            <a href="#planos">Planos</a>
          </div>
          <div>
            <h4>Suporte</h4>
            <a href="#faq">Dúvidas</a>
            <a href="#">Central de ajuda</a>
            <a href="#">Contato</a>
          </div>
          <div>
            <h4>Legal</h4>
            <a href="#">Termos de uso</a>
            <a href="#">Política de privacidade</a>
          </div>
        </div>
        <div className="container footer-bottom">© {new Date().getFullYear()} AG VPN. Todos os direitos reservados.</div>
      </footer>
    </>
  );
}

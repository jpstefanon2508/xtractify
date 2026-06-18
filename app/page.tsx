import Script from "next/script";

export default function HomePage() {
  return (
    <>
      <div id="loginView" className="login-shell">
        <section className="login-card" aria-labelledby="loginTitle">
          <div className="login-visual">
            <img src="/assets/img/login-obra.png" alt="Profissional aferindo dados em uma obra" />
            <div className="login-visual-overlay">
              <div className="login-brand">
                <div className="brand-mark">XT</div>
                <div>
                  <strong>Xtractify</strong>
                  <span>Produtividade em campo</span>
                </div>
              </div>
              <div className="login-copy">
                <p className="eyebrow">Gestao operacional</p>
                <h1 id="loginTitle">Afericao, apropriacao e produtividade em um unico fluxo.</h1>
                <p>
                  Registre equipes e atividades em tempo real, acompanhe RUP, Hh, QS e causas
                  operacionais, e entregue dados prontos para analise e exportacao.
                </p>
              </div>
              <div className="login-proof">
                <span>Dashboard vivo</span>
                <span>Campo mobile</span>
                <span>Exportacao Excel</span>
              </div>
            </div>
          </div>
          <div className="login-panel">
            <div className="login-panel-head">
              <div className="brand-mark small">XT</div>
              <div>
                <h2>Xtractify</h2>
                <p>Entre ou solicite acesso ao sistema.</p>
              </div>
            </div>
            <div className="auth-tabs" role="tablist" aria-label="Acesso">
              <button id="showLogin" className="active" type="button">Entrar</button>
              <button id="showSignup" type="button">Criar conta</button>
            </div>
            <form id="loginForm" className="form-stack auth-form">
              <label>
                Email
                <input name="email" type="email" autoComplete="username" required />
              </label>
              <label>
                Senha
                <input name="password" type="password" autoComplete="current-password" required />
              </label>
              <button className="primary-button" type="submit">Entrar</button>
              <p className="hint">Use o email e senha cadastrados no Supabase.</p>
            </form>
            <form id="signupForm" className="form-stack auth-form hidden">
              <label>
                Nome completo
                <input name="name" autoComplete="name" required />
              </label>
              <label>
                Email corporativo
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label>
                Senha
                <input name="password" type="password" autoComplete="new-password" required />
              </label>
              <label>
                Justificativa de acesso
                <textarea name="reason" placeholder="Exemplo: vou realizar afericoes em campo na frente X."></textarea>
              </label>
              <button className="primary-button" type="submit">Solicitar acesso</button>
              <p className="hint">Seu cadastro ficara pendente ate um desenvolvedor aprovar e definir seu perfil.</p>
            </form>
          </div>
        </section>
      </div>

      <div id="appShell" className="app-shell hidden sidebar-collapsed">
        <button id="toggleSidebar" className="menu-fab" type="button" title="Abrir menu" aria-label="Abrir menu">
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <aside className="sidebar" aria-label="Navegacao principal">
          <div className="sidebar-brand">
            <div className="brand-mark small">XT</div>
            <div>
              <strong>Xtractify</strong>
              <span>Produtividade</span>
            </div>
          </div>
          <nav id="sideNav" className="side-nav">
            <button data-page="home" className="active" type="button"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h6V4H4v9zm10 7h6V4h-6v16zM4 20h6v-5H4v5z" /></svg><span>Dashboard</span></button>
            <button data-page="campo" type="button"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg><span>Apropriacao</span></button>
            <button data-page="cadastros" type="button"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0M19 8v6M16 11h6" /></svg><span>Cadastros</span></button>
            <button data-page="usuarios" type="button"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg><span>Usuarios</span></button>
            <button data-page="perfil" type="button"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm8 10a8 8 0 10-16 0" /></svg><span>Perfil</span></button>
          </nav>
          <div className="sidebar-tools">
            <label className="profile-switch">Visao
              <select id="profileMode">
                <option value="developer">Desenvolvedor</option>
                <option value="client">Cliente</option>
                <option value="apurador">Apurador</option>
              </select>
            </label>
            <button id="resetDemoData" className="ghost-button icon-button-text" type="button"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 119 9M3 12h6M3 12l4-4" /></svg><span>Restaurar base</span></button>
            <button id="logoutButton" className="ghost-button icon-button-text" type="button"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M21 4v16" /></svg><span>Sair</span></button>
          </div>
        </aside>
        <button id="sidebarScrim" className="sidebar-scrim" type="button" aria-label="Fechar menu" />

        <div className="workspace">
          <header className="topbar">
            <div>
              <p className="eyebrow">Sistema online Next.js</p>
              <h2 id="pageTitle">Dashboard Operacional</h2>
            </div>
            <div className="topbar-actions">
              <button id="exportExcelTop" className="secondary-button" type="button">
                <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M4 21h16" /></svg>
                <span>Exportar Excel</span>
              </button>
              <button id="profileButton" className="user-chip" type="button" aria-label="Abrir perfil">
                <span className="user-avatar">AL</span>
                <span><strong>Administrador local</strong><small>Desenvolvedor</small></span>
              </button>
            </div>
          </header>

          <section id="globalFilters" className="filter-panel" aria-label="Filtros globais">
            <select id="periodPreset" className="hidden" aria-hidden="true">
              <option value="all">Todo periodo</option>
              <option value="yesterday">Ontem da base</option>
              <option value="last-week">Semana passada da base</option>
              <option value="current-week">Semana atual da base</option>
              <option value="custom">Intervalo customizado</option>
            </select>
            <input id="globalSearch" className="hidden" type="search" aria-hidden="true" />
            <div className="filter-compact dashboard-filters">
              <label>Inicio<input id="startDate" type="date" /></label>
              <label>Fim<input id="endDate" type="date" /></label>
              <label>Categoria (ID1)<select id="filterId1" /></label>
              <label>Subcausa (ID2)<select id="filterId2" /></label>
              <label>Funcionario<select id="filterFuncionario" /></label>
              <label>Bloco<select id="filterBloco" /></label>
              <label>Apurador<select id="filterApurador" /></label>
              <label>Cargo<select id="filterCargo" /></label>
              <label>Unidade QS
                <select id="qsUnit">
                  <option value="qtde">Quantidade</option>
                  <option value="peso_tn">Toneladas</option>
                </select>
              </label>
            </div>
            <div className="filter-actions">
              <button id="serviceOnly" className="secondary-button" type="button"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M7 12h10M10 19h4" /></svg><span>Apenas SERVICO</span></button>
              <button id="clearFilters" className="ghost-button" type="button"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 119 9M3 12h6M3 12l4-4" /></svg><span>Limpar filtros</span></button>
            </div>
          </section>
          <main id="appMain" className="main-content" tabIndex={-1} />
        </div>
      </div>

      <div id="toast" className="toast" role="status" aria-live="polite" />

      <script
        id="xtractify-config"
        dangerouslySetInnerHTML={{
          __html: `window.XTRACTIFY_SUPABASE=${JSON.stringify({
            url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
            key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
            organizationId: "00000000-0000-0000-0000-000000000001",
          })};`,
        }}
      />
      <Script src="/assets/data/data.js" strategy="afterInteractive" />
      <Script src="/assets/js/app.js" strategy="afterInteractive" />
    </>
  );
}

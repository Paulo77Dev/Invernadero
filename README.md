# React + Vite
Olá\! Ótimo projeto. Com certeza posso te ajudar a criar essa interface em React, seguindo a estrutura de arquivos e pastas que você solicitou e com um estilo bem próximo ao da imagem.

Vamos criar um passo a passo completo, desde a inicialização do projeto até o código de cada componente.

### Pré-requisitos

Antes de começar, certifique-se de que você tem o **Node.js** e o **npm** (ou Yarn) instalados no seu computador. Você pode baixá-los em [nodejs.org](https://nodejs.org/).

-----

### Passo 1: Preparando o Ambiente

Primeiro, vamos navegar até a pasta que você especificou e criar um novo projeto React usando o Vite. O Vite é uma ferramenta moderna e extremamente rápida para iniciar projetos web.

1.  Abra o seu terminal (pode ser o CMD, PowerShell ou o terminal do VS Code).

2.  Navegue até a sua pasta de trabalho com o comando `cd`:

    ```bash
    cd C:\Users\paulo\OneDrive\Área de Trabalho\Invernadero
    ```

3.  Agora, crie o projeto React. Usaremos `.` no final para criar o projeto diretamente na pasta `Invernadero`.

    ```bash
    npm create vite@latest . -- --template react
    ```

4.  Após a criação, instale as dependências do projeto:

    ```bash
    npm install
    ```

### Passo 2: Estrutura de Pastas

Dentro da pasta `src`, vamos criar uma estrutura organizada para os nossos componentes e estilos, como você pediu.

A estrutura final dentro de `src` ficará assim:

```
Invernadero/
└── src/
    ├── assets/
    │   └── line-graph.svg  (um gráfico simples que vamos criar)
    ├── components/
    │   ├── ControlButton/
    │   │   ├── ControlButton.jsx
    │   │   └── ControlButton.module.css
    │   ├── ControlSlider/
    │   │   ├── ControlSlider.jsx
    │   │   └── ControlSlider.module.css
    │   ├── EventLog/
    │   │   ├── EventLog.jsx
    │   │   └── EventLog.module.css
    │   ├── Header/
    │   │   ├── Header.jsx
    │   │   └── Header.module.css
    │   └── SensorDisplay/
    │       ├── SensorDisplay.jsx
    │       └── SensorDisplay.module.css
    ├── styles/
    │   └── global.css
    ├── App.jsx
    └── main.jsx
```

**Vamos criar essas pastas e arquivos agora.**

-----

### Passo 3: Estilos Globais e Fonte

Para manter o estilo consistente e parecido com a imagem, vamos usar uma fonte monoespaçada do Google Fonts.

1.  Crie o arquivo `src/styles/global.css` e adicione o seguinte conteúdo:

    ```css
    /* src/styles/global.css */
    @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap');

    :root {
      --background-color: #f0f0f0;
      --container-border-color: #cccccc;
      --text-color: #333333;
      --primary-border: 1.5px solid var(--text-color);
      --emergency-red: #d9534f;
      --emergency-red-hover: #c9302c;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Roboto Mono', monospace;
      background-color: var(--background-color);
      color: var(--text-color);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 2rem;
    }
    ```

2.  Agora, importe este arquivo no seu `src/main.jsx`:

    ```jsx
    // src/main.jsx
    import React from 'react'
    import ReactDOM from 'react-dom/client'
    import App from './App.jsx'
    import './styles/global.css' // <-- Adicione esta linha

    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
    ```

-----

### Passo 4: Criando os Componentes

Agora vamos criar cada componente em sua respectiva pasta.

#### 1\. Gráfico SVG (Placeholder)

Vamos criar um SVG simples para simular o gráfico.

Crie o arquivo `src/assets/line-graph.svg`:

```xml
<svg width="100%" height="40" viewBox="0 0 150 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0 25.5C10 20, 20 30, 30 28C40 26, 50 20, 60 22C70 24, 80 32, 90 30C100 28, 110 20, 120 23C130 26, 140 22, 150 20" stroke="#333333" stroke-width="1.5" fill="none"/>
<line x1="0" y1="39" x2="150" y2="39" stroke="#cccccc" stroke-width="1"/>
</svg>
```

#### 2\. Componente `Header`

Este componente terá o título e os botões de modo.

`src/components/Header/Header.jsx`:

```jsx
import React from 'react';
import styles from './Header.module.css';

const Header = ({ mode, setMode }) => {
  return (
    <div className={styles.headerContainer}>
      <h1 className={styles.title}>SMART GREENHOUSE</h1>
      <div className={styles.modeSelector}>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="mode"
            value="manual"
            checked={mode === 'manual'}
            onChange={() => setMode('manual')}
          />
          <span className={styles.radioText}>MANUAL</span>
        </label>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="mode"
            value="automatic"
            checked={mode === 'automatic'}
            onChange={() => setMode('automatic')}
          />
          <span className={styles.radioText}>AUTOMATIC</span>
        </label>
      </div>
    </div>
  );
};

export default Header;
```

`src/components/Header/Header.module.css`:

```css
.headerContainer {
  grid-area: header;
  border-bottom: var(--primary-border);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 2px;
  text-align: center;
}

.modeSelector {
  display: flex;
  justify-content: center;
  gap: 2rem;
}

.radioLabel {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
}

/* Esconde o radio button padrão */
.radioLabel input[type='radio'] {
  display: none;
}

/* Cria o nosso radio button customizado */
.radioLabel .radioText::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: var(--primary-border);
  background-color: white;
  margin-right: 8px;
  transition: all 0.2s ease;
}

/* Estilo quando selecionado */
.radioLabel input[type='radio']:checked + .radioText::before {
  background-color: var(--text-color);
  border-width: 3px;
  border-color: white;
  outline: var(--primary-border);
}
```

#### 3\. Componente `SensorDisplay`

Para mostrar a temperatura e a umidade.

`src/components/SensorDisplay/SensorDisplay.jsx`:

```jsx
import React from 'react';
import styles from './SensorDisplay.module.css';
import LineGraph from '../../assets/line-graph.svg';

const SensorDisplay = ({ label, value, unit }) => {
  return (
    <div className={styles.sensorCard}>
      <p className={styles.label}>{label}</p>
      <div className={styles.circle}>
        <span className={styles.value}>{value}</span>
        <span className={styles.unit}>{unit}</span>
      </div>
      <div className={styles.graph}>
        <img src={LineGraph} alt="Line graph" />
      </div>
    </div>
  );
};

export default SensorDisplay;
```

`src/components/SensorDisplay/SensorDisplay.module.css`:

```css
.sensorCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.label {
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 1px;
}

.circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: var(--primary-border);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  background-color: #fff;
}

.value {
  font-size: 2.5rem;
  font-weight: 700;
}

.unit {
  font-size: 1.5rem;
  margin-left: 2px;
}

.graph {
  width: 100%;
  padding: 0 1rem;
}
```

#### 4\. Componente `ControlSlider`

Para a bomba e os ventiladores.

`src/components/ControlSlider/ControlSlider.jsx`:

```jsx
import React from 'react';
import styles from './ControlSlider.module.css';

const ControlSlider = ({ label, value, onChange, disabled }) => {
  return (
    <div className={styles.sliderContainer}>
      <label className={styles.label}>{label}</label>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={onChange}
        className={styles.slider}
        disabled={disabled}
      />
    </div>
  );
};

export default ControlSlider;
```

`src/components/ControlSlider/ControlSlider.module.css`:

```css
.sliderContainer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.label {
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 1px;
}

.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  background: #fff;
  border: var(--primary-border);
  border-radius: 5px;
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  background: var(--text-color);
  border-radius: 50%;
  border: 3px solid white;
  outline: var(--primary-border);
}

.slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  background: var(--text-color);
  border-radius: 50%;
  border: 3px solid white;
  outline: var(--primary-border);
}

.slider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

#### 5\. Componente `ControlButton` (para as luzes e o botão de emergência)

`src/components/ControlButton/ControlButton.jsx`:

```jsx
import React from 'react';
import styles from './ControlButton.module.css';

const ControlButton = ({ label, type = 'toggle', active, onClick, disabled }) => {
  if (type === 'emergency') {
    return (
      <button className={`${styles.button} ${styles.emergency}`} onClick={onClick}>
        {label}
      </button>
    );
  }

  return (
    <div className={styles.toggleContainer}>
      <span className={styles.label}>{label}</span>
      <label className={styles.switch}>
        <input type="checkbox" checked={active} onChange={onClick} disabled={disabled} />
        <span className={`${styles.slider} ${styles.round}`}></span>
      </label>
    </div>
  );
};

export default ControlButton;
```

`src/components/ControlButton/ControlButton.module.css`:

```css
/* Estilos para o Toggle (luzes) */
.toggleContainer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 1px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 30px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #fff;
  border: var(--primary-border);
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 3px;
  background-color: var(--text-color);
  transition: .4s;
}

input:checked + .slider {
  background-color: var(--text-color);
}

input:checked + .slider:before {
  transform: translateX(28px);
  background-color: white;
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}

input:disabled + .slider {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Estilos para o botão de emergência */
.button {
  width: 100%;
  padding: 1rem;
  font-family: 'Roboto Mono', monospace;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 1px;
  border: var(--primary-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.emergency {
  background-color: var(--emergency-red);
  color: white;
  border-color: var(--emergency-red);
}

.emergency:hover {
  background-color: var(--emergency-red-hover);
  border-color: var(--emergency-red-hover);
}
```

#### 6\. Componente `EventLog`

`src/components/EventLog/EventLog.jsx`:

```jsx
import React from 'react';
import styles from './EventLog.module.css';

const EventLog = ({ events }) => {
  return (
    <div className={styles.logContainer}>
      <h2 className={styles.title}>EVENT LOG</h2>
      <div className={styles.logList}>
        {events.map((event, index) => (
          <div key={index} className={styles.logItem}>
            <div className={styles.checkbox}></div>
            <div className={styles.textContainer}>
              <p className={styles.logText}>{event.message}</p>
              <p className={styles.logTime}>{event.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventLog;
```

`src/components/EventLog/EventLog.module.css`:

```css
.logContainer {
  grid-area: eventlog;
  border-top: var(--primary-border);
  padding: 1rem;
}

.title {
  font-size: 0.9rem;
  letter-spacing: 1px;
  margin-bottom: 1rem;
}

.logList {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.logItem {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: var(--primary-border);
  border-radius: 8px;
  background-color: #fff;
}

.checkbox {
  width: 20px;
  height: 20px;
  border: var(--primary-border);
  flex-shrink: 0;
}

.textContainer {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.logText {
  font-size: 0.9rem;
}

.logTime {
  font-size: 0.75rem;
  color: #888;
}
```

-----

### Passo 5: Montando o `App.jsx` Principal

Agora, vamos juntar todos os componentes no arquivo `src/App.jsx`. Ele será o "cérebro" da nossa aplicação, controlando todo o estado.

Limpe o `src/App.jsx` padrão e substitua pelo código abaixo:

```jsx
// src/App.jsx
import React, { useState } from 'react';
import styles from './App.module.css';

// Importando os componentes
import Header from './components/Header/Header';
import SensorDisplay from './components/SensorDisplay/SensorDisplay';
import ControlSlider from './components/ControlSlider/ControlSlider';
import ControlButton from './components/ControlButton/ControlButton';
import EventLog from './components/EventLog/EventLog';

function App() {
  // Estado para controlar a interface
  const [mode, setMode] = useState('manual'); // 'manual' ou 'automatic'
  const [irrigation, setIrrigation] = useState(30);
  const [fans, setFans] = useState(50);
  const [lights, setLights] = useState(false);

  // Dados simulados
  const temperature = 22;
  const humidity = 56;
  const events = [
    { message: 'Irrigation pump activated.', time: '14:32' },
    { message: 'Temperature threshold reached.', time: '14:28' },
    { message: 'System switched to Manual mode.', time: '14:25' },
  ];

  const handleEmergencyStop = () => {
    alert('EMERGENCY STOP ACTIVATED!');
    setIrrigation(0);
    setFans(0);
    setLights(false);
    setMode('manual');
  };
  
  const isManualMode = mode === 'manual';

  return (
    <div className={styles.dashboard}>
      <Header mode={mode} setMode={setMode} />

      <div className={styles.mainContent}>
        <SensorDisplay label="TEMPERATURE" value={temperature} unit="°C" />
        <SensorDisplay label="RELATIVE HUMIDITY" value={humidity} unit="%" />
      </div>

      <div className={styles.controls}>
        <ControlSlider
          label="IRRIGATION PUMP"
          value={irrigation}
          onChange={(e) => setIrrigation(e.target.value)}
          disabled={!isManualMode}
        />
        <ControlSlider
          label="FANS"
          value={fans}
          onChange={(e) => setFans(e.target.value)}
          disabled={!isManualMode}
        />
        <ControlButton
          label="LIGHTS"
          type="toggle"
          active={lights}
          onClick={() => setLights(!lights)}
          disabled={!isManualMode}
        />
        <ControlButton
          label="EMERGENCY STOP"
          type="emergency"
          onClick={handleEmergencyStop}
        />
        {/* Placeholder para as linhas abaixo do botão */}
        <div className={styles.placeholderLines}>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>

      <EventLog events={events} />
    </div>
  );
}

export default App;
```

E crie o arquivo de estilo para o `App.jsx`, chamado `src/App.module.css`:

```css
/* src/App.module.css */
.dashboard {
  width: 100%;
  max-width: 800px;
  background-color: #fff;
  border: var(--primary-border);
  border-radius: 12px;
  display: grid;
  grid-template-areas:
    "header header"
    "main controls"
    "eventlog controls";
  grid-template-columns: 2fr 1fr;
  grid-template-rows: auto 1fr auto;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
}

.mainContent {
  grid-area: main;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 2rem 1rem;
  gap: 1rem;
}

.controls {
  grid-area: controls;
  border-left: var(--primary-border);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.placeholderLines {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: auto; /* Empurra para o final */
  padding-top: 1rem;
}

.placeholderLines div {
  height: 6px;
  background-color: var(--background-color);
  border: var(--primary-border);
}

/* Responsividade para telas menores */
@media (max-width: 768px) {
  .dashboard {
    grid-template-areas:
      "header"
      "main"
      "controls"
      "eventlog";
    grid-template-columns: 1fr;
  }

  .controls {
    border-left: none;
    border-top: var(--primary-border);
  }

  .mainContent {
    flex-direction: column;
  }
}
```

-----

### Passo 6: Rodando a Aplicação

Agora que todos os arquivos estão criados, volte ao seu terminal (que deve estar na pasta `Invernadero`) e execute o comando:

```bash
npm run dev
```

Seu navegador deverá abrir automaticamente com a interface do seu Invernadero Inteligente funcionando\!

### Próximos Passos

1.  **Lógica do Modo Automático:** No `App.jsx`, você pode usar um `useEffect` para simular o modo automático, onde os valores dos controles mudam baseados na temperatura e umidade.
2.  **Gráficos Reais:** Para os gráficos, você pode integrar uma biblioteca como a [Recharts](https://recharts.org/) ou [Chart.js](https://www.chartjs.org/) para exibir dados dinâmicos.
3.  **Conexão com Hardware:** No futuro, você pode conectar esta interface a um servidor (Node.js, por exemplo) que se comunicará com o seu hardware real (Arduino, ESP32, Raspberry Pi) para ler sensores e controlar atuadores.

Espero que este guia detalhado ajude você a construir uma excelente interface para o seu projeto\! Se tiver qualquer dúvida, pode perguntar.
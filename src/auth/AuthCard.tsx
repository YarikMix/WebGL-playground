import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { AuthMode } from '../types';
import type { Session } from '../session';
import { SWEEP_MS } from '../scene-config';
import Moon from './Moon';
import { useAuthForm } from './useAuthForm';
import type { Field } from './useAuthForm';

interface AuthCardProps {
  /** режим живёт в App: им управляет не только карточка, но и свет сцены */
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onSignIn: (session: Session) => void;
  /** стекло рисует сцена — карточка становится прозрачной (как у карточек блокнотов) */
  glass: boolean;
  /** свет переключается мгновенно — кросс-фейд половин тоже мгновенный, без класса .crossfading */
  reducedMotion: boolean;
}

/* Карточка входа/регистрации: две половины (форма и приглашение) стоят в DOM в постоянном
   порядке, а какая из них слева, решает CSS `order` по классу режима на карточке —
   переключение не переставляет узлы и не сбрасывает фокус. Класс `card` обязателен:
   по нему useSceneLayout находит карточку и отдаёт её в сцену стеклом. Класс `lq` включает
   правила `.cards-liquid .card.lq` (см. styles.css) — без него DOM-карточка держала бы
   собственную заливку поверх стеклянной плиты, которую сцена всё равно рисует под ней. */
export default function AuthCard({ mode, onModeChange, onSignIn, glass, reducedMotion }: AuthCardProps) {
  // показ пароля — своё состояние карточки, при смене режима гасится, чтобы пароль
  // не оставался открытым на другой форме
  const [shown, setShown] = useState(false);
  const [toast, setToast] = useState('');

  const { values, errors, busy, setValue, blurField, reset, submit } = useAuthForm(mode, onSignIn);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const fieldRef = (field: Field) => (field === 'name' ? nameRef : field === 'email' ? emailRef : passwordRef);

  // при смене режима (и при первом рендере — тогда это просто открытие формы) — сброс ошибок
  /* mode меняется сразу — от него едет луна. Содержимое форм переключает displayMode, который
     отстаёт на половину анимации: подмена случается, когда луна уже наехала на место действия,
     и наружу выходит уже новая форма. Раньше содержимое менялось в первом же кадре, и переход
     читался как «всё переименовалось и разъехалось», а не как «луна съела и выпустила». */
  const [displayMode, setDisplayMode] = useState(mode);

  // и фокус на первое поле формы
  useEffect(() => {
    reset();
    setShown(false);
    (displayMode === 'signup' ? nameRef : emailRef).current?.focus();
    // reset/submit меняются на каждый рендер (хук без useCallback) — сюда их включать не нужно,
    // эффект должен срабатывать только на смену режима
  }, [displayMode]);

  /* Кросс-фейд половин (§6.1): порядок половин переставляется через CSS `order` мгновенно —
     свойство order не анимируется, — поэтому вход/выход половин гасит отдельный класс.
     .crossfading держится первую половину SWEEP_MS (та же константа, что двигает свет
     в Planet.tsx/Backdrop.tsx — общие часы, см. scene-config.ts): opacity успевает погаснуть
     за это время и вернуться назад за вторую половину, класс уже снят. При первом рендере
     эффект не должен срабатывать — гасить нечего, это открытие формы, а не переключение. */
  const [crossfading, setCrossfading] = useState(false);
  const isFirstMode = useRef(true);
  useEffect(() => {
    if (isFirstMode.current) { isFirstMode.current = false; return; }
    if (reducedMotion) return;
    setCrossfading(true);
    const swap = setTimeout(() => setDisplayMode(mode), SWEEP_MS / 2);
    const done = setTimeout(() => setCrossfading(false), SWEEP_MS * 0.6);   // проявление успевает закончиться к приходу луны, а не после него
    return () => { clearTimeout(swap); clearTimeout(done); };
  }, [mode, reducedMotion]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const switchMode = () => {
    onModeChange(mode === 'login' ? 'signup' : 'login');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const firstBad = await submit();
    if (firstBad) fieldRef(firstBad).current?.focus();
  };

  return (
    <div className={`card auth-card mode-${mode} show-${displayMode}${glass ? ' lq' : ''}${crossfading ? ' crossfading' : ''}`}>
      <form className="auth-form" noValidate onSubmit={e => { void handleSubmit(e); }}>
        <h1>{displayMode === 'login' ? 'Вход' : 'Создание аккаунта'}</h1>
        {displayMode === 'signup' && (
          <label className="field">
            <span>Имя</span>
            <input ref={nameRef} type="text" name="name" autoComplete="name" value={values.name}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'name-error' : undefined}
              onChange={e => setValue('name', e.target.value)} onBlur={() => blurField('name')} />
            {/* Рендерится всегда (не только при ошибке): у .field-error зарезервирована высота
                строки в CSS, чтобы появление ошибки не двигало форму и не роняло клик по кнопке
                переключения режима под ней на узком экране (см. Ruling 10, task-6-report.md).
                Пустой элемент с role="alert" не озвучивается скринридером. */}
            <span id="name-error" className="field-error" role="alert">{errors.name}</span>
          </label>
        )}
        <label className="field">
          <span>Почта</span>
          <input ref={emailRef} type="email" name="email" autoComplete="email" placeholder="имя@домен" value={values.email}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            onChange={e => setValue('email', e.target.value)} onBlur={() => blurField('email')} />
          <span id="email-error" className="field-error" role="alert">{errors.email}</span>
        </label>
        <label className="field">
          <span>Пароль</span>
          <span className="field-input">
            <input ref={passwordRef} type={shown ? 'text' : 'password'} name="password" value={values.password}
              autoComplete={displayMode === 'login' ? 'current-password' : 'new-password'}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? 'password-error' : undefined}
              onChange={e => setValue('password', e.target.value)} onBlur={() => blurField('password')} />
            <button type="button" className="field-toggle" aria-pressed={shown}
              aria-label={shown ? 'Скрыть пароль' : 'Показать пароль'}
              onClick={() => setShown(v => !v)}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M1.5 9s2.8-4.5 7.5-4.5S16.5 9 16.5 9s-2.8 4.5-7.5 4.5S1.5 9 1.5 9Z"
                  stroke="currentColor" strokeWidth="1.3" fill="none" />
                <circle cx="9" cy="9" r="2.1" stroke="currentColor" strokeWidth="1.3" fill="none" />
                {shown && <path d="m3 15 12-12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />}
              </svg>
            </button>
          </span>
          <span id="password-error" className="field-error" role="alert">{errors.password}</span>
        </label>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {displayMode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>
        {displayMode === 'login' && (
          <button type="button" className="auth-aux" onClick={() => setToast('В прототипе восстановление не подключено')}>
            Забыли пароль?
          </button>
        )}
      </form>

      <Moon>
        <div className="auth-moon-face">
          <p>{displayMode === 'login' ? 'Ещё нет аккаунта?' : 'Уже есть аккаунт?'}</p>
          <button className="btn btn-ghost" type="button" onClick={switchMode}>
            {displayMode === 'login' ? 'Создать аккаунт' : 'Войти'}
          </button>
        </div>
      </Moon>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

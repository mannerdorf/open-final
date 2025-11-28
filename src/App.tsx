if (!isLogged) {
  return (
    <div className="login-form-wrapper">
      <div className="login-card">

        {/* HEADER WITH LOGO + THEME SWITCH */}
        <div className="login-header-row">
          <div className="logo-text">HAULZ</div>

          {/* OLD STYLE THEME TOGGLER */}
          <div className="switch-wrapper" onClick={toggleTheme}>
            <div className="switch-container">
              <div
                className="switch-knob"
                style={{
                  transform:
                    theme === "dark"
                      ? "translateX(18px)"
                      : "translateX(0px)",
                }}
              />
            </div>
          </div>
        </div>

        {/* SUBTITLE */}
        <p className="login-subtitle">
          Доставка грузов в Калининград и обратно
        </p>

        {/* FORM */}
        <form className="form" onSubmit={handleLogin}>

          {/* LOGIN FIELD */}
          <div className="field">
            <input
              className="login-input"
              placeholder="Логин (email)"
              value={auth.login}
              onChange={(e) =>
                setAuth({ ...auth, login: e.target.value })
              }
            />
          </div>

          {/* PASSWORD FIELD + EYE ICON */}
          <div className="field password-input-container">
            <input
              type={showPassword ? "text" : "password"}
              className="login-input"
              placeholder="Пароль"
              value={auth.password}
              onChange={(e) =>
                setAuth({ ...auth, password: e.target.value })
              }
            />

            <button
              type="button"
              className="password-visibility"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>

          {loginError && (
            <div className="error-text">{loginError}</div>
          )}

          {/* LOGIN BUTTON */}
          <button
            className="button-primary"
            type="submit"
            disabled={loadingLogin}
          >
            {loadingLogin ? "Входим..." : "Подтвердить"}
          </button>
        </form>
      </div>
    </div>
  );
}

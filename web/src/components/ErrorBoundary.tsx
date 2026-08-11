import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

// 렌더 중 예외를 잡아 전체 화이트스크린을 막는다 (라우트/앱 최상단용).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app">
          <p className="state error" role="alert">
            화면을 그리다 문제가 생겼어요: {this.state.error.message}
          </p>
        </main>
      );
    }
    return this.props.children;
  }
}

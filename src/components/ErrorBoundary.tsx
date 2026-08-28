// Production React Error Boundary Fallback Screen
import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Logger } from '../engine/ui/Logger';
import { AlertTriangle, RefreshCw, Home, Download } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    Logger.error('ErrorBoundary', 'Uncaught React Component Exception', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    this.setState({ errorInfo });
  }

  private handleRestart = (): void => {
    window.location.reload();
  };

  private handleReturnToMenu = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = '#main-menu';
    window.location.reload();
  };

  private handleDownloadDiagnostics = (): void => {
    const json = Logger.exportDiagnosticsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voxelverse-diagnostic-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 bg-[#07090e] text-white flex items-center justify-center p-6 font-sans select-none">
          <div className="w-full max-w-xl bg-[#0c0e14] border border-rose-500/40 rounded-3xl p-8 shadow-2xl space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-wider text-rose-300">Application Error Detected</h1>
                <p className="text-xs text-white/60">VoxelVerse encountered an unexpected runtime exception.</p>
              </div>
            </div>

            <div className="bg-black/60 border border-white/10 rounded-2xl p-4 font-mono text-xs text-rose-200 overflow-x-auto max-h-48 space-y-2">
              <div className="font-bold">{this.state.error?.toString()}</div>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[10px] text-white/40 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={this.handleRestart}
                className="w-full sm:w-auto flex-1 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Restart Application
              </button>

              <button
                onClick={this.handleReturnToMenu}
                className="w-full sm:w-auto flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Return to Menu
              </button>

              <button
                onClick={this.handleDownloadDiagnostics}
                className="w-full sm:w-auto py-3 px-4 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-2xl font-bold text-xs border border-amber-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                title="Download Diagnostic Log"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

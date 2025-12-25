using System.Threading;

namespace IdleonHelperBackend.Utils;

internal static class OperationCancellationManager
{
  private static CancellationTokenSource? _operationCancellationTokenSource;
  private static CancellationTokenSource? _linkedTokenSource;
  private static readonly object _lock = new object();

  /// <summary>
  /// Gets a cancellation token that is linked to both the connection token and the operation token.
  /// This ensures operations can be cancelled either by closing the connection or by sending a stop command.
  /// </summary>
  public static CancellationToken GetToken(CancellationToken connectionToken)
  {
    lock (_lock)
    {
      // Reset token source if it's been cancelled
      if (_operationCancellationTokenSource == null || _operationCancellationTokenSource.IsCancellationRequested)
      {
        Reset();
      }

      // Dispose previous linked token source if it exists
      _linkedTokenSource?.Dispose();

      // Link both tokens so cancellation of either will cancel the linked token
      _linkedTokenSource = CancellationTokenSource.CreateLinkedTokenSource(
        connectionToken,
        _operationCancellationTokenSource!.Token
      );

      return _linkedTokenSource.Token;
    }
  }

  /// <summary>
  /// Cancels the current operation token, which will cause all linked tokens to be cancelled.
  /// </summary>
  public static void Cancel()
  {
    lock (_lock)
    {
      _operationCancellationTokenSource?.Cancel();
    }
  }

  /// <summary>
  /// Resets the operation cancellation token source, creating a new one for the next operation.
  /// Should be called at the start of each new operation.
  /// </summary>
  public static void Reset()
  {
    lock (_lock)
    {
      _linkedTokenSource?.Dispose();
      _linkedTokenSource = null;
      _operationCancellationTokenSource?.Dispose();
      _operationCancellationTokenSource = new CancellationTokenSource();
    }
  }
}


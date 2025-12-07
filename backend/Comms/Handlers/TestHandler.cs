using System.Net.WebSockets;
using IdleonBotBackend.Utils;
using static IdleonBotBackend.Comms.Handlers.WsHandlerHelpers;

namespace IdleonBotBackend.Comms.Handlers;

internal class TestHandler : BaseHandler {
  public override bool CanHandle(string messageType) {
    var type = messageType.ToLowerInvariant();
    return type == "test-capture-screenshot" || type == "test-open-codex" || type == "test-open-construction";
  }

  public override async Task HandleAsync(WebSocket ws, WsRequest req) {
    var type = req.type.ToLowerInvariant();

    switch (type) {
      case "test-capture-screenshot":
        await HandleCaptureScreenshot(ws, req);
        break;
      case "test-open-codex":
        await HandleOpenCodex(ws, req);
        break;
      case "test-open-construction":
        await HandleOpenConstruction(ws, req);
        break;
    }
  }

  private static async Task HandleCaptureScreenshot(WebSocket ws, WsRequest req) {
    Console.WriteLine($"[TestHandler] Handling test-capture-screenshot request from {req.source}");
    
    await Send(ws, new WsResponse(
      type: "log",
      source: req.source,
      data: "Capturing screenshot..."
    ));

    try {
      Console.WriteLine("[TestHandler] Calling WindowCapture.CaptureAndDisplay...");
      WindowCapture.CaptureAndDisplay(CancellationToken.None);
      Console.WriteLine("[TestHandler] Screenshot captured successfully");

      await Send(ws, new WsResponse(
        type: "log",
        source: req.source,
        data: "Screenshot captured and displayed"
      ));

      await Send(ws, new WsResponse(
        type: "done",
        source: req.source,
        data: "test-capture-screenshot finished"
      ));
    } catch (Exception ex) {
      Console.WriteLine($"[TestHandler] Error capturing screenshot: {ex.Message}");
      Console.WriteLine($"[TestHandler] Stack trace: {ex.StackTrace}");
      
      await Send(ws, new WsResponse(
        type: "error",
        source: req.source,
        data: $"Failed to capture screenshot: {ex.Message}"
      ));
    }
  }

  private static async Task HandleOpenCodex(WebSocket ws, WsRequest req) {
    Console.WriteLine($"[TestHandler] Handling test-open-codex request from {req.source}");
    
    await Send(ws, new WsResponse(
      type: "log",
      source: req.source,
      data: "Opening Codex menu..."
    ));

    try {
      using var cts = new CancellationTokenSource();
      var ct = cts.Token;

      Console.WriteLine("[TestHandler] Calling NavigationUI.OpenCodex...");
      bool success = await NavigationUI.OpenCodex(ct);
      Console.WriteLine($"[TestHandler] NavigationUI.OpenCodex returned: {success}");

      if (success) {
        await Send(ws, new WsResponse(
          type: "log",
          source: req.source,
          data: "Codex menu opened successfully"
        ));

        await Send(ws, new WsResponse(
          type: "done",
          source: req.source,
          data: "test-open-codex finished"
        ));
      } else {
        Console.WriteLine("[TestHandler] Navigation.OpenCodex returned false - Codex not found");
        await Send(ws, new WsResponse(
          type: "error",
          source: req.source,
          data: "Failed to open Codex menu. Codex button not found on screen."
        ));
      }
    } catch (Exception ex) {
      Console.WriteLine($"[TestHandler] Error opening Codex: {ex.Message}");
      Console.WriteLine($"[TestHandler] Stack trace: {ex.StackTrace}");
      
      await Send(ws, new WsResponse(
        type: "error",
        source: req.source,
        data: $"Failed to open Codex: {ex.Message}"
      )      );
    }
  }

  private static async Task HandleOpenConstruction(WebSocket ws, WsRequest req) {
    Console.WriteLine($"[TestHandler] Handling test-open-construction request from {req.source}");
    
    await Send(ws, new WsResponse(
      type: "log",
      source: req.source,
      data: "Opening Construction and preparing Cogs interface..."
    ));

    try {
      using var cts = new CancellationTokenSource();
      var ct = cts.Token;

      await Send(ws, new WsResponse(
        type: "log",
        source: req.source,
        data: "Step 1: Opening Construction menu..."
      ));
      bool constructionOpened = await NavigationConstruction.OpenConstruction(ct);
      Console.WriteLine($"[TestHandler] Construction opened: {constructionOpened}");
      if (!constructionOpened) {
        await Send(ws, new WsResponse(
          type: "error",
          source: req.source,
          data: "Failed to open Construction menu"
        ));
        return;
      }

      await Send(ws, new WsResponse(
        type: "log",
        source: req.source,
        data: "Step 2: Opening Cogs tab..."
      ));
      bool cogsTabOpened = await NavigationConstruction.OpenCogsTab(ct);
      Console.WriteLine($"[TestHandler] Cogs tab opened: {cogsTabOpened}");
      if (!cogsTabOpened) {
        await Send(ws, new WsResponse(
          type: "error",
          source: req.source,
          data: "Failed to open Cogs tab"
        ));
        return;
      }

      await Send(ws, new WsResponse(
        type: "log",
        source: req.source,
        data: "Step 3: Checking trash state..."
      ));
      var (trashClosed, trashWasAlreadyClosed) = await NavigationConstruction.EnsureTrashClosed(ct);
      string trashMessage = trashWasAlreadyClosed 
        ? "Trash was already closed" 
        : trashClosed 
          ? "Trash was open, successfully closed it" 
          : "Failed to close trash";
      Console.WriteLine($"[TestHandler] {trashMessage}");
      await Send(ws, new WsResponse(
        type: "log",
        source: req.source,
        data: trashMessage
      ));
      if (!trashClosed) {
        await Send(ws, new WsResponse(
          type: "log",
          source: req.source,
          data: "Warning: Could not ensure trash is closed"
        ));
      }

      await Send(ws, new WsResponse(
        type: "log",
        source: req.source,
        data: "Step 4: Checking shelf state..."
      ));
      var (shelfClosed, shelfWasAlreadyClosed) = await NavigationConstruction.EnsureShelfClosed(ct);
      string shelfMessage = shelfWasAlreadyClosed 
        ? "Shelf was already closed" 
        : shelfClosed 
          ? "Shelf was open, successfully closed it" 
          : "Failed to close shelf";
      Console.WriteLine($"[TestHandler] {shelfMessage}");
      await Send(ws, new WsResponse(
        type: "log",
        source: req.source,
        data: shelfMessage
      ));
      if (!shelfClosed) {
        await Send(ws, new WsResponse(
          type: "log",
          source: req.source,
          data: "Warning: Could not ensure shelf is closed"
        ));
      }

      await Send(ws, new WsResponse(
        type: "log",
        source: req.source,
        data: "Step 5: Checking page state..."
      ));
      var (firstPage, wasAlreadyOnFirstPage, pagesNavigated) = await NavigationConstruction.EnsureFirstPage(ct);
      string pageMessage = wasAlreadyOnFirstPage 
        ? "Already on first page" 
        : firstPage 
          ? $"Navigated {pagesNavigated} page(s) back to reach first page" 
          : $"Failed to navigate to first page (clicked {pagesNavigated} times)";
      Console.WriteLine($"[TestHandler] {pageMessage}");
      await Send(ws, new WsResponse(
        type: "log",
        source: req.source,
        data: pageMessage
      ));
      if (!firstPage) {
        await Send(ws, new WsResponse(
          type: "log",
          source: req.source,
          data: "Warning: Could not navigate to first page"
        ));
      }

      await Send(ws, new WsResponse(
        type: "log",
        source: req.source,
        data: "Construction Cogs interface prepared successfully"
      ));

      await Send(ws, new WsResponse(
        type: "done",
        source: req.source,
        data: "test-open-construction finished"
      ));
    } catch (Exception ex) {
      Console.WriteLine($"[TestHandler] Error opening Construction: {ex.Message}");
      Console.WriteLine($"[TestHandler] Stack trace: {ex.StackTrace}");
      
      await Send(ws, new WsResponse(
        type: "error",
        source: req.source,
        data: $"Failed to open Construction: {ex.Message}"
      ));
    }
  }
}


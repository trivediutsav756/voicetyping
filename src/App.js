import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState(14);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [language, setLanguage] = useState('en-US');
  const [textAlign, setTextAlign] = useState('left');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#000000');
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const editableDivRef = useRef(null);
  const recognitionRef = useRef(null);

  // Show command feedback
  const showCommandFeedback = (message) => {
    setCommandFeedback(message);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 2000);
  };

  useEffect(() => {
    const plainText = editableDivRef.current ? editableDivRef.current.innerText : '';
    setCharCount(plainText.length);
    setWordCount(plainText.trim() === '' ? 0 : plainText.trim().split(/\s+/).length);
  }, [text]);

  // Enhanced voice command processing - handles multiple commands in one sentence
  const processVoiceCommands = (transcript) => {
    const commands = [
      { key: 'bold', rex: /\b(.+?)\s+in\s+bold\b/gi },
      { key: 'italic', rex: /\b(.+?)\s+in\s+italic\b/gi },
      { key: 'underline', rex: /\b(.+?)\s+in\s+underline\b/gi },
      { key: 'red', rex: /\b(.+?)\s+in\s+red\b/gi },
      { key: 'blue', rex: /\b(.+?)\s+in\s+blue\b/gi },
      { key: 'green', rex: /\b(.+?)\s+in\s+green\b/gi }
    ];

    let html = editableDivRef.current?.innerHTML || '';
    let hasFormatting = false;

    // 1) Apply every formatting match found in the sentence
    commands.forEach(({ key, rex }) => {
      [...transcript.matchAll(rex)].forEach(([, target]) => {
        const trimmedTarget = target.trim();
        const newHtml = applyFormattingToText(trimmedTarget, key, html);
        if (newHtml !== html) {
          html = newHtml;
          hasFormatting = true;
          showCommandFeedback(`"${trimmedTarget}" → ${key}`);
        }
      });
    });

    // 2) Update the editor if formatting was applied
    if (hasFormatting && editableDivRef.current) {
      editableDivRef.current.innerHTML = html;
      setText(html);
      
      // Place cursor at the end
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(editableDivRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // 3) Look for instant action commands after formatting
    const instantActions = [
      { rex: /\bshare document\b/i, fn: openShareModal },
      { rex: /\bexport document\b/i, fn: openExportModal },
      { rex: /\bsave document\b/i, fn: saveDocument },
      { rex: /\bprint document\b/i, fn: printDocument },
      { rex: /\bnew document\b/i, fn: () => executeGeneralCommand('newDocument') },
      { rex: /\bexport pdf\b/i, fn: exportToPdf },
      { rex: /\bexport word\b/i, fn: exportToWord },
      { rex: /\bexport html\b/i, fn: exportToHtml },
      { rex: /\bexport text\b/i, fn: exportToTxt },
      { rex: /\bcopy text\b/i, fn: copyToClipboard },
      { rex: /\bclear formatting\b/i, fn: clearAllFormatting }
    ];

    let actionExecuted = false;
    instantActions.some(({ rex, fn }) => {
      if (rex.test(transcript)) {
        fn();
        actionExecuted = true;
        return true;
      }
      return false;
    });

    // 4) If no formatting or action commands, treat as regular text input
    if (!hasFormatting && !actionExecuted && transcript.trim() !== '') {
      addTextToEditor(transcript);
    }

    return transcript;
  };

  // Precise word-boundary formatting - only formats exact words
  const applyFormattingToText = (target, formatType, html) => {
    const formatMap = {
      bold: (t) => `<strong>${t}</strong>`,
      italic: (t) => `<em>${t}</em>`,
      underline: (t) => `<u>${t}</u>`,
      red: (t) => `<span style="color:#dc2626;font-weight:bold;">${t}</span>`,
      blue: (t) => `<span style="color:#2563eb;font-weight:bold;">${t}</span>`,
      green: (t) => `<span style="color:#16a34a;font-weight:bold;">${t}</span>`
    };

    // Word boundary regex - only matches complete words
    const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escapedTarget}\\b`, 'gi');

    if (pattern.test(html) && formatMap[formatType]) {
      return html.replace(pattern, (match) => formatMap[formatType](match));
    }
    
    return html;
  };

  // Print document function
  const printDocument = () => {
    const htmlContent = editableDivRef.current ? editableDivRef.current.innerHTML : '';
    const printWindow = window.open('', '_blank');
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${documentTitle}</title>
          <style>
            body { 
              font-family: ${fontFamily}; 
              font-size: ${fontSize}px;
              color: ${textColor};
              background-color: white;
              padding: 20px;
              line-height: 1.6;
            }
            h1 {
              color: #333;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <h1>${documentTitle}</h1>
          <div>${htmlContent}</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    showCommandFeedback('Document sent to printer');
  };

  // Check for general commands
  const checkGeneralCommands = (lowerTranscript, originalTranscript) => {
    const commands = {
      newDocument: ['new document', 'clear all', 'delete all', 'start over'],
      saveDocument: ['save document', 'save file'],
      exportDocument: ['export document', 'export file', 'export this', 'download document'],
      exportTxt: ['export text', 'export txt', 'save as text'],
      exportPdf: ['export pdf', 'save as pdf', 'download pdf'],
      exportWord: ['export word', 'save as word', 'download word'],
      exportHtml: ['export html', 'save as html', 'download html'],
      shareDocument: ['share document', 'share this', 'share file'],
      copyText: ['copy text', 'copy all'],
      clearFormatting: ['clear formatting', 'remove formatting', 'plain text'],
      allBold: ['all bold', 'everything bold'],
      allItalic: ['all italic', 'everything italic'],
      allNormal: ['all normal', 'everything normal'],
      stop: ['stop', 'stop listening'],
      help: ['help', 'commands']
    };

    let commandFound = false;
    Object.entries(commands).forEach(([commandType, commandList]) => {
      if (commandList.some(cmd => lowerTranscript.includes(cmd))) {
        executeGeneralCommand(commandType);
        commandFound = true;
        return;
      }
    });

    if (!commandFound && originalTranscript.trim() !== '') {
      addTextToEditor(originalTranscript);
    }
  };

  const addTextToEditor = (newText) => {
    if (!editableDivRef.current) return;
    
    const cleanText = newText.replace(/<[^>]*>/g, '');
    editableDivRef.current.innerHTML = cleanText;
    setText(cleanText);
  };

  const executeGeneralCommand = (commandType) => {
    switch (commandType) {
      case 'newDocument':
        if (editableDivRef.current) {
          editableDivRef.current.innerHTML = '';
        }
        setText('');
        setDocumentTitle('Untitled Document');
        showCommandFeedback('New document created');
        break;
        
      case 'saveDocument':
        saveDocument();
        break;
        
      case 'exportDocument':
        openExportModal();
        break;
        
      case 'exportTxt':
        exportToTxt();
        break;
        
      case 'exportPdf':
        exportToPdf();
        break;
        
      case 'exportWord':
        exportToWord();
        break;
        
      case 'exportHtml':
        exportToHtml();
        break;
        
      case 'shareDocument':
        openShareModal();
        break;
        
      case 'copyText':
        copyToClipboard();
        break;
        
      case 'clearFormatting':
        clearAllFormatting();
        break;
        
      case 'allBold':
        setIsBold(true);
        showCommandFeedback('All text made bold');
        break;
        
      case 'allItalic':
        setIsItalic(true);
        showCommandFeedback('All text made italic');
        break;
        
      case 'allNormal':
        setIsBold(false);
        setIsItalic(false);
        setIsUnderline(false);
        showCommandFeedback('All text normalized');
        break;
        
      case 'stop':
        stopListening();
        break;
        
      case 'help':
        showCommandFeedback('Say: "[text] in bold/italic/red", "export document", "share document"');
        break;
    }
  };

  // Export Modal Functions
  const openExportModal = () => {
    setShowExportModal(true);
    showCommandFeedback('Export options opened');
  };

  const closeExportModal = () => {
    setShowExportModal(false);
  };

  // Enhanced Export Functions
  const exportToTxt = () => {
    const plainText = editableDivRef.current ? editableDivRef.current.innerText : '';
    const content = `${documentTitle}\n${'='.repeat(documentTitle.length)}\n\n${plainText}`;
    
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${documentTitle}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    showCommandFeedback('Exported as TXT file');
    closeExportModal();
  };

  const exportToPdf = () => {
    const htmlContent = editableDivRef.current ? editableDivRef.current.innerHTML : '';
    const printWindow = window.open('', '_blank');
    
    const pdfContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${documentTitle}</title>
          <style>
            @page { 
              margin: 1in; 
              size: A4;
            }
            body { 
              font-family: ${fontFamily}; 
              font-size: ${fontSize}px;
              color: ${textColor};
              background-color: white;
              padding: 0;
              margin: 0;
              line-height: 1.6;
            }
            h1 {
              color: #333;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .content {
              text-align: ${textAlign};
            }
            @media print {
              body { background-color: white !important; }
            }
          </style>
        </head>
        <body>
          <h1>${documentTitle}</h1>
          <div class="content">${htmlContent}</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(pdfContent);
    printWindow.document.close();
    
    showCommandFeedback('PDF export opened (use browser print to save)');
    closeExportModal();
  };

  const exportToWord = () => {
    const htmlContent = editableDivRef.current ? editableDivRef.current.innerHTML : '';
    
    const wordContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>${documentTitle}</title>
          <style>
            body { 
              font-family: ${fontFamily}; 
              font-size: ${fontSize}px;
              color: ${textColor};
              background-color: ${backgroundColor};
              text-align: ${textAlign};
              line-height: 1.6;
              margin: 1in;
            }
            h1 {
              color: #333;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <h1>${documentTitle}</h1>
          <div>${htmlContent}</div>
        </body>
      </html>
    `;
    
    const element = document.createElement('a');
    const file = new Blob([wordContent], { type: 'application/msword' });
    element.href = URL.createObjectURL(file);
    element.download = `${documentTitle}.doc`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    showCommandFeedback('Exported as Word document');
    closeExportModal();
  };

  const exportToHtml = () => {
    const htmlContent = editableDivRef.current ? editableDivRef.current.innerHTML : '';
    
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${documentTitle}</title>
          <style>
            body { 
              font-family: ${fontFamily}; 
              font-size: ${fontSize}px;
              color: ${textColor};
              background-color: ${backgroundColor};
              text-align: ${textAlign};
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              color: #333;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .content {
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <h1>${documentTitle}</h1>
          <div class="content">${htmlContent}</div>
        </body>
      </html>
    `;
    
    const element = document.createElement('a');
    const file = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${documentTitle}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    showCommandFeedback('Exported as HTML file');
    closeExportModal();
  };

  const exportToJson = () => {
    const plainText = editableDivRef.current ? editableDivRef.current.innerText : '';
    const htmlContent = editableDivRef.current ? editableDivRef.current.innerHTML : '';
    
    const jsonData = {
      title: documentTitle,
      content: {
        plain: plainText,
        html: htmlContent
      },
      metadata: {
        wordCount: wordCount,
        charCount: charCount,
        fontFamily: fontFamily,
        fontSize: fontSize,
        textAlign: textAlign,
        textColor: textColor,
        backgroundColor: backgroundColor,
        createdAt: new Date().toISOString(),
        formatting: {
          bold: isBold,
          italic: isItalic,
          underline: isUnderline
        }
      }
    };
    
    const element = document.createElement('a');
    const file = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `${documentTitle}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    showCommandFeedback('Exported as JSON file');
    closeExportModal();
  };

  const exportToMarkdown = () => {
    const htmlContent = editableDivRef.current ? editableDivRef.current.innerHTML : '';
    
    // Simple HTML to Markdown conversion
    let markdown = htmlContent
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '_$1_')
      .replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_')
      .replace(/<span[^>]*color:\s*red[^>]*>(.*?)<\/span>/gi, '**$1**')
      .replace(/<span[^>]*color:\s*blue[^>]*>(.*?)<\/span>/gi, '**$1**')
      .replace(/<span[^>]*color:\s*green[^>]*>(.*?)<\/span>/gi, '**$1**')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<div[^>]*>/gi, '\n')
      .replace(/<\/div>/gi, '')
      .replace(/<[^>]*>/g, '');
    
    const content = `# ${documentTitle}\n\n${markdown}`;
    
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${documentTitle}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    showCommandFeedback('Exported as Markdown file');
    closeExportModal();
  };

  const exportToRtf = () => {
    const plainText = editableDivRef.current ? editableDivRef.current.innerText : '';
    
    const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 ${fontFamily};}}\\f0\\fs${fontSize * 2} ${documentTitle}\\line\\line ${plainText}}`;
    
    const element = document.createElement('a');
    const file = new Blob([rtfContent], { type: 'application/rtf' });
    element.href = URL.createObjectURL(file);
    element.download = `${documentTitle}.rtf`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    showCommandFeedback('Exported as RTF file');
    closeExportModal();
  };

  // Share Modal Functions
  const openShareModal = () => {
    setShowShareModal(true);
    showCommandFeedback('Share options opened');
  };

  const closeShareModal = () => {
    setShowShareModal(false);
  };

  const shareToWhatsApp = () => {
    const plainText = editableDivRef.current ? editableDivRef.current.innerText : '';
    const message = encodeURIComponent(`${documentTitle}\n\n${plainText}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
    showCommandFeedback('Shared to WhatsApp');
    closeShareModal();
  };

  const shareToTwitter = () => {
    const plainText = editableDivRef.current ? editableDivRef.current.innerText : '';
    const tweet = encodeURIComponent(`${documentTitle}\n\n${plainText.substring(0, 200)}...`);
    window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank');
    showCommandFeedback('Shared to Twitter');
    closeShareModal();
  };

  const shareToEmail = () => {
    const plainText = editableDivRef.current ? editableDivRef.current.innerText : '';
    const subject = encodeURIComponent(documentTitle);
    const body = encodeURIComponent(`Hi,\n\nI wanted to share this document with you:\n\n"${documentTitle}"\n\n${plainText}\n\nBest regards`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    showCommandFeedback('Email opened');
    closeShareModal();
  };

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        processVoiceCommands(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        showCommandFeedback(`Error: ${event.error}`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } else {
      alert('Speech recognition is not supported in this browser.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      showCommandFeedback('Voice recognition stopped');
    }
  };

  const saveDocument = () => {
    const content = editableDivRef.current ? editableDivRef.current.innerHTML : '';
    localStorage.setItem('textEditorContent', content);
    localStorage.setItem('textEditorTitle', documentTitle);
    showCommandFeedback('Document saved');
  };

  const copyToClipboard = () => {
    const plainText = editableDivRef.current ? editableDivRef.current.innerText : '';
    navigator.clipboard.writeText(plainText).then(() => {
      showCommandFeedback('Text copied to clipboard');
    }).catch(() => {
      showCommandFeedback('Copy failed');
    });
  };

  const clearAllFormatting = () => {
    if (editableDivRef.current) {
      const plainText = editableDivRef.current.innerText;
      editableDivRef.current.innerHTML = plainText;
      setText(plainText);
    }
    setIsBold(false);
    setIsItalic(false);
    setIsUnderline(false);
    showCommandFeedback('All formatting cleared');
  };

  // Updated handleContentChange
  const handleContentChange = () => setText(editableDivRef.current?.innerHTML || '');

  return (
    <div className="text-editor">
      {/* Header */}
      <header className="editor-header">
        <h1 className="editor-title">Voice Text Editor - {documentTitle}</h1>
      </header>

      {/* Voice Controls */}
      <div className="voice-toolbar">
        <button 
          className={`voice-btn ${isListening ? 'listening' : ''}`} 
          onClick={startListening}
          disabled={isListening}
        >
          {isListening ? '🎤 Listening...' : '▶ Start Voice'}
        </button>
        <button 
          className="voice-btn stop" 
          onClick={stopListening}
          disabled={!isListening}
        >
          ⏹ Stop
        </button>
        
        <div className="voice-status">
          <span className="voice-hint">
            Try: "hello word in blue blue in red share document" | Multiple commands in one sentence!
          </span>
        </div>
      </div>

      {/* Main Toolbar */}
      <div className="main-toolbar">
        <div className="toolbar-group">
          <button className="toolbar-btn primary" onClick={() => executeGeneralCommand('newDocument')}>
            📄 New
          </button>
          <button className="toolbar-btn success" onClick={() => executeGeneralCommand('saveDocument')}>
            💾 Save
          </button>
          <button className="toolbar-btn info" onClick={openExportModal}>
            📥 Export
          </button>
          <button className="toolbar-btn warning" onClick={openShareModal}>
            📤 Share
          </button>
        </div>

        <div className="toolbar-group formatting">
          <select 
            value={fontFamily} 
            onChange={(e) => setFontFamily(e.target.value)}
            className="font-select"
          >
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
          </select>
          
          <select 
            value={fontSize} 
            onChange={(e) => setFontSize(parseInt(e.target.value))}
            className="size-select"
          >
            {[10, 12, 14, 16, 18, 20, 22, 24, 28, 32].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>

          <button 
            className={`format-btn ${isBold ? 'active' : ''}`} 
            onClick={() => setIsBold(!isBold)}
          >
            <strong>B</strong>
          </button>
          <button 
            className={`format-btn ${isItalic ? 'active' : ''}`} 
            onClick={() => setIsItalic(!isItalic)}
          >
            <em>I</em>
          </button>
          <button 
            className={`format-btn ${isUnderline ? 'active' : ''}`} 
            onClick={() => setIsUnderline(!isUnderline)}
          >
            <span style={{ textDecoration: 'underline' }}>U</span>
          </button>
          
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="color-input"
          />
        </div>

        <div className="toolbar-group">
          <button 
            className="toolbar-btn"
            onClick={() => executeGeneralCommand('clearFormatting')}
          >
            🧹 Clear Format
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="content-container">
        <div className="document-area">
          <div className="document-header">
            <input
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="document-title-input"
              placeholder="Document Title"
            />
            <div className="document-actions">
              <span className="mode-indicator">Enhanced Voice Commands</span>
            </div>
          </div>
          
          <div className="document-content">
            <div
              ref={editableDivRef}
              contentEditable={true}
              onInput={handleContentChange}
              className="rich-editor"
              style={{
                fontFamily,
                fontSize: `${fontSize}px`,
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                textDecoration: isUnderline ? 'underline' : 'none',
                textAlign,
                backgroundColor,
                color: textColor,
                minHeight: '400px',
                padding: '20px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                outline: 'none',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}
              suppressContentEditableWarning={true}
            />
            {editableDivRef.current && editableDivRef.current.innerHTML === '' && (
              <div className="editor-placeholder">
                Say: "hello word in blue are in red share document" - multiple commands work instantly!
              </div>
            )}
          </div>
          
          <div className="document-footer">
            <span>Characters: {charCount}</span>
            <span>Words: {wordCount}</span>
            <span>Formatted: {text.includes('<') ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      {/* Enhanced Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={closeExportModal}>
          <div className="export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="export-modal-header">
              <h2>📥 Export Document</h2>
              <button className="close-btn" onClick={closeExportModal}>×</button>
            </div>
            
            <div className="export-modal-content">
              <div className="export-preview">
                <h3>{documentTitle}</h3>
                <p>{wordCount} words • {charCount} characters</p>
                <p>{editableDivRef.current ? editableDivRef.current.innerText.substring(0, 100) + '...' : 'No content'}</p>
              </div>
              
              <div className="export-options">
                <h4>Document Formats:</h4>
                <div className="export-buttons">
                  <button className="export-btn txt" onClick={exportToTxt}>
                    📄 TXT File
                  </button>
                  <button className="export-btn pdf" onClick={exportToPdf}>
                    📕 PDF File
                  </button>
                  <button className="export-btn word" onClick={exportToWord}>
                    📘 Word Doc
                  </button>
                  <button className="export-btn html" onClick={exportToHtml}>
                    🌐 HTML File
                  </button>
                </div>
                
                <h4>Developer Formats:</h4>
                <div className="export-buttons">
                  <button className="export-btn json" onClick={exportToJson}>
                    📋 JSON Data
                  </button>
                  <button className="export-btn markdown" onClick={exportToMarkdown}>
                    📝 Markdown
                  </button>
                  <button className="export-btn rtf" onClick={exportToRtf}>
                    📃 RTF File
                  </button>
                </div>
                
                <div className="export-info">
                  <h4>📋 Export Information:</h4>
                  <ul>
                    <li><strong>TXT:</strong> Plain text without formatting</li>
                    <li><strong>PDF:</strong> Formatted document for printing</li>
                    <li><strong>Word:</strong> Microsoft Word compatible</li>
                    <li><strong>HTML:</strong> Web page format with styling</li>
                    <li><strong>JSON:</strong> Structured data with metadata</li>
                    <li><strong>Markdown:</strong> Markdown syntax for developers</li>
                    <li><strong>RTF:</strong> Rich Text Format for compatibility</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={closeShareModal}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <h2>📤 Share Document</h2>
              <button className="close-btn" onClick={closeShareModal}>×</button>
            </div>
            
            <div className="share-modal-content">
              <div className="share-preview">
                <h3>{documentTitle}</h3>
                <p>{editableDivRef.current ? editableDivRef.current.innerText.substring(0, 100) + '...' : 'No content'}</p>
              </div>
              
              <div className="share-options">
                <h4>Quick Share:</h4>
                <div className="share-buttons">
                  <button className="share-btn whatsapp" onClick={shareToWhatsApp}>
                    💬 WhatsApp
                  </button>
                  <button className="share-btn twitter" onClick={shareToTwitter}>
                    🐦 Twitter
                  </button>
                  <button className="share-btn email" onClick={shareToEmail}>
                    📧 Email
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-left">
          <span className={`status-indicator ${isListening ? 'listening' : 'idle'}`}>
            {isListening ? '🎤 Listening' : '⏸ Ready'}
          </span>
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
        <div className="status-right">
          <span>Enhanced Voice Commands: ON</span>
          <span>{documentTitle}</span>
        </div>
      </div>

      {/* Voice Command Feedback */}
      {showFeedback && (
        <div className="command-feedback">
          <div className="feedback-content">
            <span className="feedback-icon">🎤</span>
            <span className="feedback-message">{commandFeedback}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

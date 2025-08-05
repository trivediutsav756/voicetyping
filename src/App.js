import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  // --- State ---
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [shouldListen, setShouldListen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState(14);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [language, setLanguage] = useState('en-US');
  const [textAlign, setTextAlign] = useState('left');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#000000');
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // --- NEW STATE FOR DUPLICATE PREVENTION ---
  const [lastProcessedText, setLastProcessedText] = useState('');
  const [processingTimeout, setProcessingTimeout] = useState(null);
  
  const editableDivRef = useRef(null);
  const recognitionRef = useRef(null);

  // --- Utility Function ---
  const showCommandFeedback = (message) => {
    setCommandFeedback(message);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 2000);
  };

  // --- Modal and Export Functions ---
  const openShareModal = () => { setShowShareModal(true); showCommandFeedback('Share options opened'); };
  const closeShareModal = () => setShowShareModal(false);
  const openExportModal = () => { setShowExportModal(true); showCommandFeedback('Export options opened'); };
  const closeExportModal = () => setShowExportModal(false);

  const saveDocument = () => {
    try {
      const content = editableDivRef.current ? editableDivRef.current.innerHTML : '';
      const timestamp = new Date().toISOString();
      
      localStorage.setItem('textEditorContent', content);
      localStorage.setItem('textEditorTitle', documentTitle);
      localStorage.setItem('textEditorLastSaved', timestamp);
      
      const historyKey = `textEditorHistory_${documentTitle}`;
      let history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      
      history.unshift({ content, timestamp });
      
      if (history.length > 5) {
        history = history.slice(0, 5);
      }
      
      localStorage.setItem(historyKey, JSON.stringify(history));
      
      showCommandFeedback(`Document "${documentTitle}" saved successfully`);
    } catch (error) {
      console.error('Error saving document:', error);
      showCommandFeedback('Error saving document');
    }
  };

  const printDocument = () => {
    const htmlContent = editableDivRef.current ? editableDivRef.current.innerHTML : '';
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${documentTitle}</title>
        <style>
          body { font-family: ${fontFamily}; font-size: ${fontSize}px; color: ${textColor}; background-color: white; padding: 20px; line-height: 1.6; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>${documentTitle}</h1>
        <div>${htmlContent}</div>
        <script>
          window.onload = function() { window.print(); setTimeout(() => window.close(), 1000); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    showCommandFeedback('Document sent to printer');
  };

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
          @page { margin: 1in; size: A4; }
          body { font-family: ${fontFamily}; font-size: ${fontSize}px; color: ${textColor}; background-color: white; margin: 0; line-height: 1.6; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .content { text-align: ${textAlign}; }
          @media print { body { background-color: white !important; } }
        </style>
      </head>
      <body>
        <h1>${documentTitle}</h1>
        <div class="content">${htmlContent}</div>
        <script>
          window.onload = function() { window.print(); setTimeout(() => window.close(), 1000); }
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
          body { font-family: ${fontFamily}; font-size: ${fontSize}px; color: ${textColor}; background-color: ${backgroundColor}; text-align: ${textAlign}; line-height: 1.6; margin: 1in; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
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
          body { font-family: ${fontFamily}; font-size: ${fontSize}px; color: ${textColor}; background-color: ${backgroundColor}; text-align: ${textAlign}; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .content { margin-top: 20px; }
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
      content: { plain: plainText, html: htmlContent },
      metadata: {
        wordCount, charCount, fontFamily, fontSize, textAlign, textColor, backgroundColor,
        createdAt: new Date().toISOString(),
        formatting: { bold: isBold, italic: isItalic, underline: isUnderline }
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
    let markdown = htmlContent
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '_$1_')
      .replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_')
      .replace(/<span[^>]*color:\s*red[^>]*>(.*?)<\/span>/gi, '**$1**')
      .replace(/<span[^>]*color:\s*blue[^>]*>(.*?)<\/span>/gi, '**$1**')
      .replace(/<span[^>]*color:\s*green[^>]*>(.*?)<\/span>/gi, '**$1**')
      .replace(/<br\s*\/?>/gi, '\n').replace(/<div[^>]*>/gi, '\n').replace(/<\/div>/gi, '')
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
    setIsBold(false); setIsItalic(false); setIsUnderline(false);
    showCommandFeedback('All formatting cleared');
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

  // --- General Command Handler ---
  const executeGeneralCommand = (commandType) => {
    switch (commandType) {
      // Text alignment commands
      case 'textLeft':
        setTextAlign('left');
        showCommandFeedback('Text aligned left');
        break;
      case 'textCenter':
        setTextAlign('center');
        showCommandFeedback('Text centered');
        break;
      case 'textRight':
        setTextAlign('right');
        showCommandFeedback('Text aligned right');
        break;
        
      case 'newDocument':
        try {
          const currentContent = editableDivRef.current ? editableDivRef.current.innerHTML : '';
          const hasContent = currentContent.trim() !== '';
          
          if (hasContent) {
            saveDocument();
          }
          
          if (editableDivRef.current) { 
            editableDivRef.current.innerHTML = ''; 
          }
          
          setText(''); 
          setDocumentTitle('Untitled Document');
          setIsBold(false);
          setIsItalic(false);
          setIsUnderline(false);
          setFontFamily('Arial');
          setFontSize(14);
          setTextColor('#000000');
          setBackgroundColor('#ffffff');
          setTextAlign('left');
          setLastProcessedText(''); // Clear processed text
          
          showCommandFeedback('New document created');
        } catch (error) {
          console.error('Error creating new document:', error);
          showCommandFeedback('Error creating new document');
        }
        break;
      
      case 'clearAllText':
        try {
          if (editableDivRef.current) {
            editableDivRef.current.innerHTML = '';
          }
          setText('');
          setLastProcessedText(''); // Clear processed text
          showCommandFeedback('All text cleared');
        } catch (error) {
          console.error('Error clearing text:', error);
          showCommandFeedback('Error clearing text');
        }
        break;
      case 'saveDocument': saveDocument(); break;
      case 'exportDocument': openExportModal(); break;
      case 'exportTxt': exportToTxt(); break;
      case 'exportPdf': exportToPdf(); break;
      case 'exportWord': exportToWord(); break;
      case 'exportHtml': exportToHtml(); break;
      case 'shareDocument': openShareModal(); break;
      case 'copyText': copyToClipboard(); break;
      case 'clearFormatting': clearAllFormatting(); break;
      case 'allBold': setIsBold(true); showCommandFeedback('All text made bold'); break;
      case 'allItalic': setIsItalic(true); showCommandFeedback('All text made italic'); break;
      case 'allNormal': setIsBold(false); setIsItalic(false); setIsUnderline(false); showCommandFeedback('All text normalized'); break;
      case 'stop': stopListening(); break;
      case 'help': showCommandFeedback('Say: "[text] bold and red", "[text] bold+red", ...');  break;
      default: break;
    }
  };

  // --- Voice Command Patterns ---
  const comboNames = [
    ['bold', 'red'],   ['bold', 'blue'],   ['bold', 'green'],
    ['italic', 'red'], ['italic', 'blue'], ['italic', 'green'],
    ['underline', 'red'], ['underline', 'blue'], ['underline', 'green'],
  ];
  const combinedCommands = [];
  comboNames.forEach(([style, color]) => {
    const key = `${style}+${color}`;
    const patterns = [
      `${style}\\+${color}`,
      `${color}\\+${style}`,
      `${style}\\s+and\\s+${color}`,
      `${color}\\s+and\\s+${style}`,
      `${style}\\s*\\+?\\s*${color}`,
      `${color}\\s*\\+?\\s*${style}`,
      `in\\s+${style}\\+${color}`,
      `in\\s+${color}\\+${style}`,
      `in\\s+${style}\\s+and\\s+${color}`,
      `in\\s+${color}\\s+and\\s+${style}`,
      `in\\s+${style}\\s*\\+?\\s*${color}`,
      `in\\s+${color}\\s*\\+?\\s*${style}`,
    ];
    patterns.forEach(pattern => {
      combinedCommands.push({
        key,
        rex: new RegExp(`(.+?)\\s+(?:${pattern})\\b`, 'i'),
      });
    });
  });
  
  const singleCommands = [
    { key: 'bold', rex: /(.+?)\s+(?:in\s+)?bold\b/i },
    { key: 'italic', rex: /(.+?)\s+(?:in\s+)?italic\b/i },
    { key: 'underline', rex: /(.+?)\s+(?:in\s+)?underline\b/i },
    { key: 'red', rex: /(.+?)\s+(?:in\s+)?red\b/i },
    { key: 'blue', rex: /(.+?)\s+(?:in\s+)?blue\b/i },
    { key: 'green', rex: /(.+?)\s+(?:in\s+)?green\b/i }
  ];

  // --- Formatting Helpers ---
  const applyCombinedFormattingToText = (target, formatType, html) => {
    const formatMap = {
      'bold+red': (t) => `<span style="color:#dc2626;font-weight:bold;">${t}</span>`,
      'bold+blue': (t) => `<span style="color:#2563eb;font-weight:bold;">${t}</span>`,
      'bold+green': (t) => `<span style="color:#16a34a;font-weight:bold;">${t}</span>`,
      'italic+red': (t) => `<span style="color:#dc2626;font-style:italic;font-weight:bold;">${t}</span>`,
      'italic+blue': (t) => `<span style="color:#2563eb;font-style:italic;font-weight:bold;">${t}</span>`,
      'italic+green': (t) => `<span style="color:#16a34a;font-style:italic;font-weight:bold;">${t}</span>`,
      'underline+red': (t) => `<span style="color:#dc2626;text-decoration:underline;font-weight:bold;">${t}</span>`,
      'underline+blue': (t) => `<span style="color:#2563eb;text-decoration:underline;font-weight:bold;">${t}</span>`,
      'underline+green': (t) => `<span style="color:#16a34a;text-decoration:underline;font-weight:bold;">${t}</span>`
    };
    const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escapedTarget}\\b`, 'i');
    if (pattern.test(html) && formatMap[formatType]) {
      return html.replace(pattern, (match) => formatMap[formatType](match));
    }
    if (!pattern.test(html) && formatMap[formatType]) {
      const currentContent = html || '';
      return currentContent + (currentContent ? ' ' : '') + formatMap[formatType](target);
    }
    return html;
  };

  const applyFormattingToText = (target, formatType, html) => {
    const formatMap = {
      bold: (t) => `<strong>${t}</strong>`,
      italic: (t) => `<em>${t}</em>`,
      underline: (t) => `<u>${t}</u>`,
      red: (t) => `<span style="color:#dc2626;font-weight:bold;">${t}</span>`,
      blue: (t) => `<span style="color:#2563eb;font-weight:bold;">${t}</span>`,
      green: (t) => `<span style="color:#16a34a;font-weight:bold;">${t}</span>`
    };
    const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escapedTarget}\\b`, 'i');
    if (pattern.test(html) && formatMap[formatType]) {
      return html.replace(pattern, (match) => formatMap[formatType](match));
    }
    if (!pattern.test(html) && formatMap[formatType]) {
      const currentContent = html || '';
      return currentContent + (currentContent ? ' ' : '') + formatMap[formatType](target);
    }
    return html;
  };
  
  // --- Logic for Punctuation and Emotion Styling ---
  const questionStarters = ['who', 'what', 'where', 'when', 'why', 'how', 'is', 'are', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should'];
  const exclamationWords = ['wow', 'amazing', 'great', 'awesome', 'stop', 'no'];
  
  const emotionStyles = {
    'happy': (t) => `<span style="color:#f59e0b; font-weight:bold;">${t}</span>`,
    'sad': (t) => `<span style="color:#3b82f6; font-style:italic;">${t}</span>`,
    'angry': (t) => `<span style="color:#ef4444; font-weight:bold; text-transform:uppercase;">${t}</span>`,
    'love': (t) => `<span style="color:#ec4899;">❤️ ${t}</span>`,
    'success': (t) => `<span style="color:#22c55e; font-weight:bold;">${t}</span>`,
    'idea': (t) => `<span style="color:#8b5cf6;">💡 ${t}</span>`,
    'warning': (t) => `<span style="color:#eab308; font-weight:bold;">⚠️ ${t}</span>`,
  };

  const applyAutoFormatting = (text) => {
    let formattedText = text;

    // Apply emotion styling
    Object.keys(emotionStyles).forEach(emotion => {
      const regex = new RegExp(`\\b(${emotion})\\b`, 'gi');
      if (regex.test(formattedText)) {
        showCommandFeedback(`Styled "${emotion}"`);
        formattedText = formattedText.replace(regex, (match) => emotionStyles[emotion](match));
      }
    });

    // Apply auto-punctuation
    const lowerText = formattedText.toLowerCase().trim();
    if (questionStarters.some(starter => lowerText.startsWith(starter)) && !lowerText.endsWith('?')) {
      formattedText += '?';
      showCommandFeedback('Added question mark');
    } else if (exclamationWords.some(word => lowerText.includes(word)) && !lowerText.endsWith('!')) {
      formattedText += '!';
      showCommandFeedback('Added exclamation mark');
    }

    return formattedText;
  };

  // --- ENHANCED DUPLICATE DETECTION ---
  const isDuplicateText = (newText, lastText) => {
    if (!newText || !lastText) return false;
    
    const cleanNew = newText.toLowerCase().trim();
    const cleanLast = lastText.toLowerCase().trim();
    
    // Exact match
    if (cleanNew === cleanLast) return true;
    
    // Check if new text is contained in recent text
    if (cleanLast.includes(cleanNew) && cleanNew.length > 3) return true;
    
    // Similarity check for longer texts
    if (cleanNew.length > 10) {
      const similarity = calculateSimilarity(cleanNew, cleanLast);
      return similarity > 0.85;
    }
    
    return false;
  };

  // --- ENHANCED addTextToEditor ---
  const addTextToEditor = (newText) => {
    if (!editableDivRef.current) return;
    
    // Create a temporary element to get the plain text version for duplicate checks
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newText;
    const cleanText = tempDiv.textContent || tempDiv.innerText || '';

    if (cleanText.trim() === '') return; // Don't add empty strings
    
    // Enhanced duplicate detection
    if (isDuplicateText(cleanText, lastProcessedText)) {
      console.log('Prevented duplicate text:', cleanText);
      return;
    }
    
    const currentContent = editableDivRef.current.innerHTML || '';
    const currentTextContent = editableDivRef.current.innerText || '';
    
    // Check against recent words in the editor
    const words = cleanText.toLowerCase().split(/\s+/);
    const currentWords = currentTextContent.toLowerCase().split(/\s+/);
    const lastWords = currentWords.slice(-words.length).join(' ');
    
    // Check if the new text exactly matches the end of current text
    if (words.join(' ') === lastWords) {
      console.log('Prevented exact duplicate:', cleanText);
      return;
    }
    
    // Check if new text is a subset of recent text
    const recentText = currentWords.slice(-15).join(' ');
    if (recentText.includes(words.join(' ')) && words.length > 1) {
      console.log('Prevented subset duplicate:', cleanText);
      return;
    }
    
    // Use the newText which may contain HTML formatting from emotions
    let formattedText = newText;
    
    // Apply global styles (like toggling bold) only if the text isn't already heavily styled
    if (!newText.includes('<span')) {
        if (isBold || isItalic || isUnderline) {
          const tempElement = document.createElement('span');
          tempElement.innerText = cleanText;
          if (isBold) tempElement.style.fontWeight = 'bold';
          if (isItalic) tempElement.style.fontStyle = 'italic';
          if (isUnderline) tempElement.style.textDecoration = 'underline';
          formattedText = tempElement.outerHTML;
        }
    }
    
    const updatedContent = currentContent + (currentContent && !currentContent.endsWith(' ') ? ' ' : '') + formattedText;
    editableDivRef.current.innerHTML = updatedContent;
    setText(updatedContent);
    
    // Update last processed text
    setLastProcessedText(cleanText);
    
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(editableDivRef.current);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  // --- Voice Recognition Logic ---
  const calculateSimilarity = (str1, str2) => {
    const cleanStr1 = str1.toLowerCase().replace(/[^\w\s]/g, '');
    const cleanStr2 = str2.toLowerCase().replace(/[^\w\s]/g, '');
    if (!cleanStr1.length || !cleanStr2.length) return 0;
    if (cleanStr1 === cleanStr2) return 1;
    const len1 = cleanStr1.length;
    const len2 = cleanStr2.length;
    const maxLen = Math.max(len1, len2);
    if (maxLen > 100) {
      if (cleanStr1.includes(cleanStr2) || cleanStr2.includes(cleanStr1)) return 0.9;
      const words1 = new Set(cleanStr1.split(/\s+/));
      const words2 = new Set(cleanStr2.split(/\s+/));
      let commonWords = 0;
      for (const word of words1) {
        if (words2.has(word)) commonWords++;
      }
      return commonWords / Math.max(words1.size, words2.size);
    }
    let commonChars = 0;
    for (let i = 0; i < len1; i++) {
      if (cleanStr2.includes(cleanStr1[i])) commonChars++;
    }
    return commonChars / maxLen;
  };
  
  // --- ENHANCED startListening ---
  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = language;
      recognition.maxAlternatives = 1; // Reduce alternatives
      
      recognition.onstart = () => {
        setIsListening(true);
        showCommandFeedback('Listening started');
        setLastProcessedText(''); // Clear previous text
      };
      
      recognition.onresult = (event) => {
        // Only process the latest final result
        const lastResultIndex = event.results.length - 1;
        const lastResult = event.results[lastResultIndex];
        
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript.trim();
          
          // Add a small delay to prevent rapid processing
          setTimeout(() => {
            processVoiceCommands(transcript);
          }, 100);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        showCommandFeedback(`Error: ${event.error}`);
      };
      
      recognition.onend = () => {
        // Only restart if we want to keep listening and no error occurred
        if (shouldListen && isListening) {
          setTimeout(() => {
            if (shouldListen) {
              recognition.start();
            }
          }, 500); // Add delay before restart
        } else {
          setIsListening(false);
        }
      };
      
      recognitionRef.current = recognition;
      setShouldListen(true);
      recognition.start();
    } else {
      alert('Speech recognition is not supported in this browser.');
    }
  };

  // --- ENHANCED stopListening ---
  const stopListening = () => {
    setShouldListen(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setLastProcessedText(''); // Clear processed text
      if (processingTimeout) {
        clearTimeout(processingTimeout);
        setProcessingTimeout(null);
      }
      showCommandFeedback('Voice recognition stopped');
    }
  };

  // --- ENHANCED processVoiceCommands ---
  const processVoiceCommands = (transcript) => {
    const cleanTranscript = transcript.trim();
    
    // NEW: Check font size commands FIRST
    const fontSizeMatch = cleanTranscript.match(/font size (\d{1,3})/i);
    if (fontSizeMatch) {
      const newSize = parseInt(fontSizeMatch[1], 10);
      if (newSize >= 8 && newSize <= 72) {
        setFontSize(newSize);
        showCommandFeedback(`Font size set to ${newSize}`);
      } else {
        showCommandFeedback(`Font size ${newSize} is out of range (8-72)`);
      }
      return;
    }
    
    // Check alignment commands
    const alignmentPhrases = [
      { phrase: /^(align |text )?left\b/i, command: 'textLeft' },
      { phrase: /^(align |text )?center\b/i, command: 'textCenter' },
      { phrase: /^(align |text )?right\b/i, command: 'textRight' },
    ];
    
    for (const alignment of alignmentPhrases) {
      if (alignment.phrase.test(cleanTranscript)) {
        executeGeneralCommand(alignment.command);
        return; // Exit early after handling alignment
      }
    }
    
    // Clear any existing timeout
    if (processingTimeout) {
      clearTimeout(processingTimeout);
    }
    
    // Check for duplicates at the start
    if (isDuplicateText(cleanTranscript, lastProcessedText)) {
      console.log('Duplicate command detected, skipping:', cleanTranscript);
      return;
    }
    
    // Set a timeout to prevent rapid repeated processing
    const timeoutId = setTimeout(() => {
      setLastProcessedText(cleanTranscript);
    }, 1000);
    setProcessingTimeout(timeoutId);
    
    let html = editableDivRef.current?.innerHTML || '';
    let hasFormatting = false;
    let processedText = cleanTranscript;
    
    const instantActions = [
      { rex: /\bshare document\b/i, fn: openShareModal },
      { rex: /\bexport document\b/i, fn: openExportModal },
      { rex: /\bsave document\b/i, fn: saveDocument },
      { rex: /\bprint document\b/i, fn: printDocument },
      { rex: /\bnew document\b/i, fn: () => executeGeneralCommand('newDocument') },
      { rex: /\bcreate new document\b/i, fn: () => executeGeneralCommand('newDocument') },
      { rex: /\bstart new document\b/i, fn: () => executeGeneralCommand('newDocument') },
      { rex: /\bnew file\b/i, fn: () => executeGeneralCommand('newDocument') },
      { rex: /\bexport pdf\b/i, fn: exportToPdf },
      { rex: /\bexport word\b/i, fn: exportToWord },
      { rex: /\bexport html\b/i, fn: exportToHtml },
      { rex: /\bexport text\b/i, fn: exportToTxt },
      { rex: /\bcopy text\b/i, fn: copyToClipboard },
      { rex: /\bcopy all\b/i, fn: copyToClipboard },
      { rex: /\bclear formatting\b/i, fn: clearAllFormatting },
      { rex: /\bremove formatting\b/i, fn: clearAllFormatting },
      { rex: /\bclear all text\b/i, fn: () => executeGeneralCommand('clearAllText') },
      { rex: /\bclear all\b/i, fn: () => executeGeneralCommand('clearAllText') },
      { rex: /\bclear text\b/i, fn: () => executeGeneralCommand('clearAllText') },
      { rex: /\bdelete all text\b/i, fn: () => executeGeneralCommand('clearAllText') },
      { rex: /\bdelete all\b/i, fn: () => executeGeneralCommand('clearAllText') },
      { rex: /\berase all\b/i, fn: () => executeGeneralCommand('clearAllText') },
      { rex: /\berase everything\b/i, fn: () => executeGeneralCommand('clearAllText') },
      { rex: /\bremove all text\b/i, fn: () => executeGeneralCommand('clearAllText') },
      { rex: /\bsave\b/i, fn: saveDocument },
      { rex: /\bsave file\b/i, fn: saveDocument },
      { rex: /\bnew\b/i, fn: () => executeGeneralCommand('newDocument') }
    ];
    
    let actionExecuted = false;
    instantActions.some(({ rex, fn }) => {
      if (rex.test(processedText)) {
        fn(); 
        actionExecuted = true;
        processedText = processedText.replace(rex, '').trim(); 
        return true;
      }
      return false;
    });

    if(actionExecuted) {
      if (processedText.length === 0) return;
      const fillerWords = /^\s*(please|now|thanks|thank you|ok|okay)\s*$/i;
      if (fillerWords.test(processedText.trim())) {
        return; 
      }
    }

    combinedCommands.forEach(({ key, rex }) => {
      const match = processedText.match(rex);
      if (match && match[1]) {
        const target = match[1].trim();
        const newHtml = applyCombinedFormattingToText(target, key, html);
        if (newHtml !== html) {
          html = newHtml;
          hasFormatting = true;
          showCommandFeedback(`"${target}" → ${key.replace('+', ' + ')}`);
          processedText = processedText.replace(rex, '').trim();
        }
      }
    });
    
    if (!hasFormatting) {
      singleCommands.forEach(({ key, rex }) => {
        const match = processedText.match(rex);
        if (match && match[1]) {
          const target = match[1].trim();
          const newHtml = applyFormattingToText(target, key, html);
          if (newHtml !== html) {
            html = newHtml;
            hasFormatting = true;
            showCommandFeedback(`"${target}" → ${key}`);
            processedText = processedText.replace(rex, '').trim();
          }
        }
      });
    }

    if (hasFormatting && editableDivRef.current) {
      editableDivRef.current.innerHTML = html;
      setText(html);
      const range = document.createRange(), sel = window.getSelection();
      range.selectNodeContents(editableDivRef.current); 
      range.collapse(false);
      sel.removeAllRanges(); 
      sel.addRange(range);
    }
    
    const remainingText = processedText.trim();
    if (remainingText !== '') {
      const fillerPhrases = [
        /^\s*um+\s*$/i, /^\s*uh+\s*$/i, /^\s*hmm+\s*$/i, /^\s*well\s*$/i,
        /^\s*so\s*$/i, /^\s*like\s*$/i, /^\s*you know\s*$/i, /^\s*actually\s*$/i,
        /^\s*basically\s*$/i, /^\s*literally\s*$/i, /^\s*right\s*$/i, /^\s*anyway\s*$/i
      ];
      
      const isFillerPhrase = fillerPhrases.some(pattern => pattern.test(remainingText));
      
      if (!isFillerPhrase) {
        const finalText = applyAutoFormatting(remainingText);
        addTextToEditor(finalText);
      } else {
        showCommandFeedback('Filtered filler words');
      }
    }
    
    return transcript;
  };

  useEffect(() => {
    const plainText = editableDivRef.current ? editableDivRef.current.innerText : '';
    setCharCount(plainText.length);
    setWordCount(plainText.trim() === '' ? 0 : plainText.trim().split(/\s+/).length);
  }, [text]);
  
  useEffect(() => {
    try {
      const savedContent = localStorage.getItem('textEditorContent');
      const savedTitle = localStorage.getItem('textEditorTitle');
      const lastSaved = localStorage.getItem('textEditorLastSaved');
      
      if (savedContent && savedContent.trim() !== '') {
        if (editableDivRef.current) {
          editableDivRef.current.innerHTML = savedContent;
          setText(savedContent);
        }
        
        if (savedTitle) {
          setDocumentTitle(savedTitle);
        }
        
        if (lastSaved) {
          const formattedDate = new Date(lastSaved).toLocaleString();
          showCommandFeedback(`Loaded document from ${formattedDate}`);
        } else {
          showCommandFeedback('Loaded saved document');
        }
      }
    } catch (error) {
      console.error('Error loading saved document:', error);
    }
  }, []);
  
  const handleContentChange = () => setText(editableDivRef.current?.innerHTML || '');

  // --- UI ---
  return (
    <div className="text-editor">
      <header className="editor-header"><h1>Voice Text Editor - {documentTitle}</h1></header>
      <div className="voice-toolbar">
        <button className={`voice-btn ${isListening ? 'listening' : ''}`} onClick={startListening} disabled={isListening}>
          {isListening ? '🎤 Listening...' : '▶ Start Voice'}
        </button>
        <button className="voice-btn stop" onClick={stopListening} disabled={!isListening}>⏹ Stop</button>
        <div className="voice-status">
          <span className="voice-hint">
            Try: <strong>font size 26</strong> | <strong>text center</strong> | <strong>where are you</strong>
          </span>
        </div>
      </div>
      <div className="main-toolbar">
        <div className="toolbar-group">
          <button className="toolbar-btn primary" onClick={() => executeGeneralCommand('newDocument')}>📄 New</button>
          <button className="toolbar-btn success" onClick={() => executeGeneralCommand('saveDocument')}>💾 Save</button>
          <button className="toolbar-btn info" onClick={openExportModal}>📥 Export</button>
          <button className="toolbar-btn warning" onClick={openShareModal}>📤 Share</button>
        </div>
        <div className="toolbar-group formatting">
          <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="font-select">
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
          </select>
          <select value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} className="size-select">
            {[10,12,14,16,18,20,22,24,28,32].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <button className={`format-btn ${isBold ? 'active' : ''}`} onClick={() => setIsBold(!isBold)}><strong>B</strong></button>
          <button className={`format-btn ${isItalic ? 'active' : ''}`} onClick={() => setIsItalic(!isItalic)}><em>I</em></button>
          <button className={`format-btn ${isUnderline ? 'active' : ''}`} onClick={() => setIsUnderline(!isUnderline)}>
            <span style={{ textDecoration: 'underline' }}>U</span>
          </button>
          <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="color-input" />
        </div>
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => executeGeneralCommand('clearFormatting')}>🧹 Clear Format</button>
        </div>
      </div>
      <div className="content-container">
        <div className="document-area">
          <div className="document-header">
            <input type="text" value={documentTitle} onChange={e => setDocumentTitle(e.target.value)}
              className="document-title-input" placeholder="Document Title"/>
            <div className="document-actions">
              <span className="mode-indicator"><strong>Auto-formatting: ON</strong></span>
            </div>
          </div>
          <div className="document-content">
            <div ref={editableDivRef} contentEditable={true} onInput={handleContentChange} className="rich-editor"
              style={{
                fontFamily, fontSize: `${fontSize}px`, fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal', textDecoration: isUnderline ? 'underline' : 'none',
                textAlign, backgroundColor, color: textColor,
                minHeight: '400px', padding: '20px',
                border: '1px solid #ddd', borderRadius: '4px', outline: 'none', lineHeight: '1.6',
                whiteSpace: 'pre-wrap', wordWrap: 'break-word'
              }}
              suppressContentEditableWarning={true}
            />
            {editableDivRef.current && editableDivRef.current.innerHTML === '' && (
              <div className="editor-placeholder">
                Try saying: <strong>font size 26</strong> | <strong>where are you font size 18</strong>
              </div>
            )}
          </div>
          <div className="document-footer">
            <span>Characters: {charCount}</span>
            <span>Words: {wordCount}</span>
            <span>Font Size: {fontSize}px</span>
          </div>
        </div>
      </div>
      {showExportModal && (
        <div className="modal-overlay" onClick={closeExportModal}>
          <div className="export-modal" onClick={e => e.stopPropagation()}>
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
                  <button className="export-btn txt" onClick={exportToTxt}>📄 TXT File</button>
                  <button className="export-btn pdf" onClick={exportToPdf}>📕 PDF File</button>
                  <button className="export-btn word" onClick={exportToWord}>📘 Word Doc</button>
                  <button className="export-btn html" onClick={exportToHtml}>🌐 HTML File</button>
                </div>
                <h4>Developer Formats:</h4>
                <div className="export-buttons">
                  <button className="export-btn json" onClick={exportToJson}>📋 JSON Data</button>
                  <button className="export-btn markdown" onClick={exportToMarkdown}>📝 Markdown</button>
                  <button className="export-btn rtf" onClick={exportToRtf}>📃 RTF File</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showShareModal && (
        <div className="modal-overlay" onClick={closeShareModal}>
          <div className="share-modal" onClick={e => e.stopPropagation()}>
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
                  <button className="share-btn whatsapp" onClick={shareToWhatsApp}>💬 WhatsApp</button>
                  <button className="share-btn twitter" onClick={shareToTwitter}>🐦 Twitter</button>
                  <button className="share-btn email" onClick={shareToEmail}>📧 Email</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="status-bar">
        <div className="status-left">
          <span className={`status-indicator ${isListening ? 'listening' : 'idle'}`}>
            {isListening ? '🎤 Listening' : '⏸ Ready'}
          </span>
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
        <div className="status-right">
          <span><strong>Auto-Formatting: ON</strong></span>
          <span>{documentTitle}</span>
        </div>
      </div>
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

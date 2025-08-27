'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';
import { DocumentPlusIcon, CloudArrowUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface TemplateUploadWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateUploaded: (templateId: string) => void;
}

interface UploadStep {
  id: number;
  title: string;
  description: string;
}

const steps: UploadStep[] = [
  {
    id: 1,
    title: 'Template-Datei auswählen',
    description: 'Wählen Sie eine HTML-, CSS- oder ZIP-Datei mit Ihrem Template aus'
  },
  {
    id: 2,
    title: 'Template-Details',
    description: 'Geben Sie Name und Beschreibung für Ihr Template ein'
  },
  {
    id: 3,
    title: 'Validierung & Vorschau',
    description: 'Überprüfen Sie Ihr Template vor dem Hochladen'
  }
];

export default function TemplateUploadWizard({ isOpen, onClose, onTemplateUploaded }: TemplateUploadWizardProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [currentStep, setCurrentStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 - File Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Step 2 - Template Details
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState<'standard' | 'premium' | 'custom'>('custom');

  // Step 3 - Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [templatePreview, setTemplatePreview] = useState<string>('');

  const handleFileSelect = useCallback((file: File) => {
    // Validiere Dateityp
    const allowedTypes = ['text/html', 'text/css', 'application/zip', 'application/x-zip-compressed'];
    const allowedExtensions = ['.html', '.htm', '.css', '.zip'];
    
    const isValidType = allowedTypes.includes(file.type) || 
                       allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
      setError('Nur HTML-, CSS- oder ZIP-Dateien sind erlaubt');
      return;
    }

    // Validiere Dateigröße (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Die Datei darf nicht größer als 10MB sein');
      return;
    }

    setSelectedFile(file);
    setError(null);
    
    // Automatisch Template-Name aus Dateiname ableiten
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    setTemplateName(nameWithoutExt);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const validateTemplate = useCallback(async () => {
    if (!selectedFile) return false;

    const errors: string[] = [];
    
    try {
      const fileContent = await selectedFile.text();
      
      // HTML-Validation
      if (selectedFile.type === 'text/html' || selectedFile.name.endsWith('.html')) {
        if (!fileContent.includes('<!DOCTYPE') && !fileContent.includes('<html')) {
          errors.push('HTML-Datei muss eine gültige HTML-Struktur haben');
        }
        
        // Prüfe auf erforderliche Template-Variablen
        const requiredVariables = ['{{companyName}}', '{{content}}'];
        requiredVariables.forEach(variable => {
          if (!fileContent.includes(variable)) {
            errors.push(`Template-Variable ${variable} fehlt`);
          }
        });
      }

      // CSS-Validation
      if (selectedFile.type === 'text/css' || selectedFile.name.endsWith('.css')) {
        // Grundlegende CSS-Syntax-Prüfung
        if (!fileContent.includes('{') || !fileContent.includes('}')) {
          errors.push('CSS-Datei enthält keine gültigen CSS-Regeln');
        }
      }

      setValidationErrors(errors);
      
      // Einfache Vorschau erstellen
      if (errors.length === 0 && fileContent) {
        const preview = fileContent.substring(0, 500) + (fileContent.length > 500 ? '...' : '');
        setTemplatePreview(preview);
      }
      
      return errors.length === 0;
    } catch (error) {
      errors.push('Fehler beim Lesen der Datei');
      setValidationErrors(errors);
      return false;
    }
  }, [selectedFile]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !currentOrganization?.id) return;

    setIsUploading(true);
    setError(null);

    try {
      const fileContent = await selectedFile.text();
      
      const templateData = {
        name: templateName,
        description: templateDescription,
        category: templateCategory,
        htmlContent: fileContent,
        isCustom: true,
        organizationId: currentOrganization.id,
        createdBy: user?.uid || '',
        thumbnailUrl: '', // Wird später durch Preview-Generation erstellt
        variables: [] // Könnte durch Template-Analyse befüllt werden
      };

      const templateId = await pdfTemplateService.createCustomTemplate(templateData);
      
      onTemplateUploaded(templateId);
      onClose();
      
      // Reset Form
      setCurrentStep(1);
      setSelectedFile(null);
      setTemplateName('');
      setTemplateDescription('');
      setTemplateCategory('custom');
      setValidationErrors([]);
      setTemplatePreview('');
      
    } catch (error) {
      console.error('Template-Upload Fehler:', error);
      setError('Fehler beim Hochladen des Templates');
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, user, currentOrganization, templateName, templateDescription, templateCategory, onTemplateUploaded, onClose]);

  const handleNext = useCallback(async () => {
    if (currentStep === 1 && selectedFile) {
      setCurrentStep(2);
    } else if (currentStep === 2 && templateName.trim()) {
      const isValid = await validateTemplate();
      if (isValid) {
        setCurrentStep(3);
      }
    }
  }, [currentStep, selectedFile, templateName, validateTemplate]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Custom Template hochladen
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="sr-only">Schließen</span>
              ✕
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="mt-4 flex items-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step.id <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step.id}
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-1 w-16 mx-2 ${
                    step.id < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Step 1: File Upload */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {steps[0].title}
                </h3>
                <p className="text-gray-600 mb-4">{steps[0].description}</p>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900">
                    Template-Datei hier ablegen
                  </p>
                  <p className="text-gray-600">oder</p>
                  <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                    <DocumentPlusIcon className="h-4 w-4 mr-2" />
                    Datei auswählen
                    <input
                      type="file"
                      className="sr-only"
                      accept=".html,.htm,.css,.zip"
                      onChange={handleFileInput}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Unterstützte Formate: HTML, CSS, ZIP (max. 10MB)
                </p>
              </div>

              {selectedFile && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <DocumentPlusIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Template Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {steps[1].title}
                </h3>
                <p className="text-gray-600 mb-4">{steps[1].description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template-Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mein Custom Template"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beschreibung
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Beschreiben Sie Ihr Template..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategorie
                </label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value as 'standard' | 'premium' | 'custom')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="custom">Custom Template</option>
                  <option value="standard">Standard Template</option>
                  <option value="premium">Premium Template</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Validation & Preview */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {steps[2].title}
                </h3>
                <p className="text-gray-600 mb-4">{steps[2].description}</p>
              </div>

              {validationErrors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <h4 className="font-medium text-red-900 mb-2">Validierungsfehler:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {templatePreview && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Template-Vorschau:</h4>
                  <pre className="text-xs text-gray-600 bg-gray-50 p-4 rounded-lg overflow-x-auto">
                    {templatePreview}
                  </pre>
                </div>
              )}

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-medium text-blue-900 mb-2">Template-Details:</h4>
                <dl className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-blue-700">Name:</dt>
                    <dd className="text-blue-900 font-medium">{templateName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-blue-700">Kategorie:</dt>
                    <dd className="text-blue-900">{templateCategory}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-blue-700">Dateigröße:</dt>
                    <dd className="text-blue-900">{selectedFile && (selectedFile.size / 1024).toFixed(1)} KB</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Zurück
          </button>

          <div className="flex items-center space-x-3">
            {currentStep < 3 && (
              <button
                onClick={handleNext}
                disabled={(currentStep === 1 && !selectedFile) || (currentStep === 2 && !templateName.trim())}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Weiter
              </button>
            )}
            
            {currentStep === 3 && (
              <button
                onClick={handleUpload}
                disabled={isUploading || validationErrors.length > 0}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Wird hochgeladen...' : 'Template hochladen'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
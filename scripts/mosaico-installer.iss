[Setup]
AppId={{872734A0-7558-402F-9474-8ACCB789FA73}
AppName=Mosaico Studio
AppVersion=0.1.0
DefaultDirName={localappdata}\Programs\Mosaico Studio
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
DisableProgramGroupPage=yes
OutputDir=..\release
OutputBaseFilename=MosaicoStudio-Setup
WizardStyle=modern
UninstallDisplayIcon={app}\MosaicoStudio.exe
SetupIconFile=..\assets\mosaico.ico

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Files]
Source: "..\release\MosaicoStudio.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{userprograms}\Mosaico Studio"; Filename: "{app}\MosaicoStudio.exe"

[Run]
Filename: "{app}\MosaicoStudio.exe"; Description: "Abrir Mosaico Studio"; Flags: nowait postinstall skipifsilent

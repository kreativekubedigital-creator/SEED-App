const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/components/dashboards/TeacherResultWorkspace.tsx',
  'src/components/dashboards/ResultManagement.tsx'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update input fields
    const oldInputClass1 = /className="w-full text-center px-2 py-2 rounded-xl border-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500\/20 outline-none font-medium text-gray-700 disabled:opacity-50 disabled:bg-transparent"/g;
    const newInputClass1 = 'className="w-full text-center px-2 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-medium text-gray-900 transition-all disabled:opacity-50 disabled:bg-transparent cursor-text placeholder:text-gray-300" placeholder="-"';
    
    content = content.replace(oldInputClass1, newInputClass1);

    const oldInputClass2 = /className="w-full px-2 py-2 rounded-lg border border-gray-200 text-center font-medium focus:border-blue-500 outline-none"/g;
    const newInputClass2 = 'className="w-full text-center px-2 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-medium text-gray-900 transition-all disabled:opacity-50 disabled:bg-transparent cursor-text placeholder:text-gray-300" placeholder="-"';
    
    content = content.replace(oldInputClass2, newInputClass2);

    // Update calculated fields (CA Total, Final)
    // In TeacherResultWorkspace:
    content = content.replace(/<td className="px-4 py-3 bg-gray-50\/30 text-center">\s*<span className="font-medium text-gray-600">\{score\.caTotal \|\| 0\}<\/span>\s*<\/td>/g, 
      '<td className="px-4 py-3 bg-gray-100/80 text-center border-x border-gray-50">\n                          <span className="font-semibold text-gray-700">{score.caTotal || 0}</span>\n                        </td>');

    content = content.replace(/<td className="px-4 py-3 bg-blue-50\/10 text-center">\s*<span className="font-medium text-blue-700">\{score\.finalScore \|\| 0\}<\/span>\s*<\/td>/g, 
      '<td className="px-4 py-3 bg-blue-50/50 text-center border-x border-blue-50/50">\n                          <span className="font-semibold text-blue-800">{score.finalScore || 0}</span>\n                        </td>');

    // In ResultManagement:
    content = content.replace(/<td className="px-4 py-4 bg-blue-50\/30 text-center font-medium text-blue-600">\s*\{score\.caTotal \|\| 0\}\s*<\/td>/g, 
      '<td className="px-4 py-4 bg-gray-100/80 text-center font-semibold text-gray-700 border-x border-gray-50">\n                              {score.caTotal || 0}\n                            </td>');

    content = content.replace(/<td className="px-4 py-4 bg-indigo-50\/30 text-center font-medium text-indigo-600">\s*\{score\.finalScore \|\| 0\}\s*<\/td>/g, 
      '<td className="px-4 py-4 bg-blue-50/50 text-center font-semibold text-blue-800 border-x border-blue-50/50">\n                              {score.finalScore || 0}\n                            </td>');

    // Update mobile cards active state
    // TeacherResultWorkspace
    content = content.replace(/<div key=\{student\.uid\} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-4">/g, 
      '<div key={student.uid} className={`bg-white rounded-2xl shadow-sm border ${activeRow === student.uid ? \'border-blue-300 bg-blue-50/20 ring-4 ring-blue-500/5\' : \'border-gray-200\'} p-5 flex flex-col gap-5 transition-all duration-200`} onFocus={() => setActiveRow(student.uid)} onBlur={() => setActiveRow(null)}>');

    // ResultManagement
    content = content.replace(/<div key=\{result\.id\} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-4">/g, 
      '<div key={result.id} className={`bg-white rounded-2xl shadow-sm border ${activeRow === result.id ? \'border-blue-300 bg-blue-50/20 ring-4 ring-blue-500/5\' : \'border-gray-200\'} p-5 flex flex-col gap-5 transition-all duration-200`} onFocus={() => setActiveRow(result.id)} onBlur={() => setActiveRow(null)}>');

    // Mobile calculated fields
    content = content.replace(/<div className="flex flex-col items-center justify-center">\s*<span className="text-\[10px\] text-gray-500 mb-1">CA Total<\/span>\s*<span className="font-medium text-gray-600">\{(score|result)\.caTotal \|\| 0\}<\/span>\s*<\/div>/g, 
      '<div className="flex flex-col items-center justify-center bg-gray-100/80 rounded-xl p-2">\n                            <span className="text-[10px] text-gray-500 mb-1 font-medium">CA Total</span>\n                            <span className="font-semibold text-gray-800">{$1.caTotal || 0}</span>\n                          </div>');

    content = content.replace(/<div className="flex flex-col items-center justify-center">\s*<span className="text-\[10px\] text-blue-400\/80 mb-1">Final<\/span>\s*<span className="font-medium text-blue-700">\{(score|result)\.finalScore \|\| 0\}<\/span>\s*<\/div>/g, 
      '<div className="flex flex-col items-center justify-center bg-blue-50/80 rounded-xl p-2 border border-blue-100/50">\n                            <span className="text-[10px] text-blue-600 mb-1 font-medium">Final</span>\n                            <span className="font-semibold text-blue-800">{$1.finalScore || 0}</span>\n                          </div>');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});

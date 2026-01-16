const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/app/admin/tasks/page.tsx',
  'src/app/admin/job-levels/page.tsx',
  'src/app/admin/departments/page.tsx',
  'src/app/admin/admins/page.tsx',
  'src/app/admin/users/tasks/page.tsx',
  'src/app/user/member-management/page.tsx',
  'src/app/user/team-overview/page.tsx',
];

const debounceCode = `  // Debounce search term to avoid refetching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [searchTerm])

`;

function updateFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Check if already has debounced search
  if (content.includes('debouncedSearchTerm')) {
    console.log(`⏭️  Already updated: ${filePath}`);
    return false;
  }

  // Step 1: Add debouncedSearchTerm state after searchTerm
  content = content.replace(
    /(const \[searchTerm, setSearchTerm\] = useState\(['"].*?['"]\))/,
    `$1\n  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')`
  );

  // Step 2: Add debounce useEffect before first fetch function
  const fetchFunctionMatch = content.match(/(  const fetch\w+ = async \(\) => {)/);
  if (fetchFunctionMatch) {
    content = content.replace(
      fetchFunctionMatch[1],
      `${debounceCode}${fetchFunctionMatch[1]}`
    );
  }

  // Step 3: Replace searchTerm with debouncedSearchTerm in fetch params
  content = content.replace(
    /\.\.\.(searchTerm && \{ search: searchTerm \})/g,
    '...(debouncedSearchTerm && { search: debouncedSearchTerm })'
  );

  // Step 4: Replace searchTerm with debouncedSearchTerm in useEffect dependencies
  content = content.replace(
    /, searchTerm\]/g,
    ', debouncedSearchTerm]'
  );

  // Write the updated content
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ Updated: ${filePath}`);
  return true;
}

console.log('🔄 Adding debounced search to all pages...\n');

let updatedCount = 0;
filesToUpdate.forEach(file => {
  if (updateFile(file)) {
    updatedCount++;
  }
});

console.log(`\n✨ Done! Updated ${updatedCount} file(s).`);

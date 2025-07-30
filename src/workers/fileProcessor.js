const { parentPort, workerData } = require('worker_threads');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Import models
const Agent = require('../models/Agent');
const User = require('../models/User');
const Account = require('../models/Account');
const LOB = require('../models/LOB');
const Carrier = require('../models/Carrier');
const Policy = require('../models/Policy');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(workerData.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Worker connected to MongoDB');
  } catch (error) {
    console.error('Worker DB connection failed:', error);
    throw error;
  }
};

// Process XLSX file
const processXLSX = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};

// Process CSV file
const processCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

// Helper function to create or find entity by unique field
const findOrCreateEntity = async (model, data, uniqueField) => {
  try {
    // Skip if essential data is missing
    if (!data || !data[uniqueField]) {
      console.log(`Skipping ${model.modelName} creation - missing ${uniqueField}`);
      return null;
    }
    
    const query = {};
    query[uniqueField] = data[uniqueField];
    
    let entity = await model.findOne(query);
    if (!entity) {
      // Clean the data before creating entity
      const cleanData = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null && value !== '') {
          cleanData[key] = value;
        }
      }
      
      entity = new model(cleanData);
      await entity.save();
      console.log(`Created new ${model.modelName}: ${cleanData[uniqueField]}`);
    } else {
      console.log(`Found existing ${model.modelName}: ${entity[uniqueField]}`);
    }
    return entity;
  } catch (error) {
    console.error(`Error creating/finding ${model.modelName}:`, error.message);
    console.error(`Data that caused error:`, JSON.stringify(data, null, 2));
    return null;
  }
};

// Process consolidated data (all entities in one row)
const processConsolidatedData = async (data) => {
  const results = {
    users: { created: 0, updated: 0, errors: [] },
    agents: { created: 0, updated: 0, errors: [] },
    accounts: { created: 0, updated: 0, errors: [] },
    lobs: { created: 0, updated: 0, errors: [] },
    carriers: { created: 0, updated: 0, errors: [] },
    policies: { created: 0, updated: 0, errors: [] }
  };

  for (const row of data) {
    try {
      // Skip empty rows
      if (!row || Object.keys(row).length === 0) continue;

      let user = null, agent = null, account = null, lob = null, carrier = null;

      // 1. Create/Find User
      if (row.email || row.firstname) {
        // Clean and normalize gender
        let gender = 'other';
        if (row.gender) {
          const genderLower = row.gender.toLowerCase().trim();
          if (['male', 'm'].includes(genderLower)) gender = 'male';
          else if (['female', 'f'].includes(genderLower)) gender = 'female';
        }

        // Clean and normalize userType
        let userType = 'individual';
        if (row.userType) {
          const userTypeLower = row.userType.toLowerCase().trim().replace(/\s+/g, '_');
          if (['active_client', 'activeclient'].includes(userTypeLower)) userType = 'active_client';
          else if (['client'].includes(userTypeLower)) userType = 'client';
          else if (['business', 'corporate'].includes(userTypeLower)) userType = 'business';
          else if (['family'].includes(userTypeLower)) userType = 'family';
        }

        const userData = {
          firstName: row.firstname || row.firstName || '',
          lastName: row.lastname || row.lastName || '',
          email: row.email || `user_${Date.now()}_${Math.floor(Math.random() * 1000)}@placeholder.com`,
          phoneNumber: row.phone || row.phoneNumber || '',
          gender: gender,
          userType: userType,
          dob: row.dob ? new Date(row.dob) : new Date('1990-01-01'),
          address: {
            street: row.address || '',
            city: row.city || '',
            state: row.state || 'CA',
            zipCode: row.zip || '00000'
          }
        };
        
        user = await findOrCreateEntity(User, userData, 'email');
        if (user) results.users.created++;
      }

      // 2. Create/Find Agent
      if (row.agent) {
        const agentData = {
          agentName: row.agent,
          email: `${row.agent.replace(/\s+/g, '').toLowerCase()}@agency.com`,
          phone: row.agent_phone || '',
          status: 'active'
        };
        
        agent = await findOrCreateEntity(Agent, agentData, 'agentName');
        if (agent) results.agents.created++;
      }

      // 3. Create/Find LOB (Category)
      if (row.company_category_policy_sta) {
        const lobData = {
          categoryName: row.company_category_policy_sta,
          categoryCode: row.company_category_policy_sta.substring(0, 5).toUpperCase(),
          description: `Policy category: ${row.company_category_policy_sta}`,
          basePremiumRate: 100,
          riskLevel: 'medium'
        };
        
        lob = await findOrCreateEntity(LOB, lobData, 'categoryName');
        if (lob) results.lobs.created++;
      }

      // 4. Create/Find Carrier
      if (row.csr || row.company_category_policy_sta) {
        const carrierData = {
          companyName: row.csr || row.company_category_policy_sta || 'Default Insurance Co',
          companyCode: (row.csr || 'DEF').substring(0, 5).toUpperCase(),
          licenseNumber: `LIC-${Date.now()}`,
          contactInfo: {
            phone: '+1-800-INSURANCE',
            email: 'contact@insurance.com'
          }
        };
        
        carrier = await findOrCreateEntity(Carrier, carrierData, 'companyName');
        if (carrier) results.carriers.created++;
      }

      // 5. Create/Find Account
      if (user && (row.account_r || row.account_t)) {
        const accountData = {
          accountName: row.account_r || `${user.firstName} Account`,
          accountType: row.account_t || 'personal',
          userId: user._id
        };
        
        account = await findOrCreateEntity(Account, accountData, 'accountName');
        if (account) results.accounts.created++;
      }

      // 6. Create Policy (main entity)
      if (user && (row.policy_nu || row.premium)) {
        const policyData = {
          policyNumber: row.policy_nu || `POL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          policyStartDate: new Date(),
          policyEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          premiumAmount: parseFloat(row.premium || 0),
          coverageAmount: parseFloat(row.premium || 0) * 10, // Assume 10x coverage
          deductible: 500,
          status: row.hasActiveClientPoli === 'true' || row.hasActiveClientPoli === '1' ? 'active' : 'pending',
          userId: user._id,
          agentId: agent?._id,
          policyCategoryId: lob?._id,
          companyCollectionId: carrier?._id,
          accountId: account?._id
        };

        try {
          // Check if policy already exists
          const existingPolicy = await Policy.findOne({ 
            policyNumber: policyData.policyNumber 
          });
          
          if (!existingPolicy) {
            const policy = new Policy(policyData);
            await policy.save();
            results.policies.created++;
          } else {
            results.policies.updated++;
          }
        } catch (error) {
          results.policies.errors.push(`Policy error: ${error.message}`);
        }
      }

    } catch (error) {
      console.error('Error processing row:', error.message);
      results.policies.errors.push(`Row processing error: ${error.message}`);
    }
  }

  return results;
};

// Map data to models based on sheet type
const mapDataToModel = async (data, sheetType) => {
  // Handle consolidated data format
  if (sheetType.toLowerCase() === 'consolidated') {
    return await processConsolidatedData(data);
  }

  const mappedData = [];
  
  for (const row of data) {
    let mappedRow = {};
    
    switch (sheetType.toLowerCase()) {
      case 'agent':
        mappedRow = {
          agentName: row['Agent Name'] || row.agentName || row.agent || row.name,
          email: row['Email'] || row.email,
          phone: row['Phone'] || row.phone || row.phoneNumber,
          department: row['Department'] || row.department,
          status: row['Status'] || row.status || 'active'
        };
        break;
        
      case 'user':
        // Clean and normalize gender
        let userGender = 'other';
        const genderInput = row['Gender'] || row.gender || '';
        if (genderInput) {
          const genderLower = genderInput.toLowerCase().trim();
          if (['male', 'm'].includes(genderLower)) userGender = 'male';
          else if (['female', 'f'].includes(genderLower)) userGender = 'female';
        }

        // Clean and normalize userType
        let mappedUserType = 'individual';
        const userTypeInput = row['User Type'] || row.userType || '';
        if (userTypeInput) {
          const userTypeLower = userTypeInput.toLowerCase().trim().replace(/\s+/g, '_');
          if (['active_client', 'activeclient'].includes(userTypeLower)) mappedUserType = 'active_client';
          else if (['client'].includes(userTypeLower)) mappedUserType = 'client';
          else if (['business', 'corporate'].includes(userTypeLower)) mappedUserType = 'business';
          else if (['family'].includes(userTypeLower)) mappedUserType = 'family';
        }

        mappedRow = {
          firstName: row['First Name'] || row.firstName || row.firstname || row.first_name,
          lastName: row['Last Name'] || row.lastName || row.lastname || row.last_name,
          dob: new Date(row['DOB'] || row.dob || row.dateOfBirth || '1990-01-01'),
          address: {
            street: row['Address'] || row.address || row.street,
            city: row['City'] || row.city,
            state: row['State'] || row.state,
            zipCode: row['Zip Code'] || row.zipCode || row.zip,
          },
          phoneNumber: row['Phone Number'] || row.phoneNumber || row.phone,
          email: row['Email'] || row.email,
          gender: userGender,
          userType: mappedUserType
        };
        break;
        
      case 'account':
        mappedRow = {
          accountName: row['Account Name'] || row.accountName || row.account_r,
          accountType: row['Account Type'] || row.accountType || row.account_t || 'personal',
          // userId will be populated during processing
        };
        break;
        
      case 'lob':
        mappedRow = {
          categoryName: row['Category Name'] || row.categoryName || row.company_category_policy_sta,
          categoryCode: row['Category Code'] || row.categoryCode,
          description: row['Description'] || row.description,
          basePremiumRate: parseFloat(row['Base Premium Rate'] || row.basePremiumRate || 100),
          riskLevel: row['Risk Level'] || row.riskLevel || 'medium'
        };
        break;
        
      case 'carrier':
        mappedRow = {
          companyName: row['Company Name'] || row.companyName || row.csr,
          companyCode: row['Company Code'] || row.companyCode,
          licenseNumber: row['License Number'] || row.licenseNumber || `LIC-${Date.now()}`,
          address: {
            street: row['Address'] || row.address,
            city: row['City'] || row.city,
            state: row['State'] || row.state,
            zipCode: row['Zip Code'] || row.zipCode,
          },
          contactInfo: {
            phone: row['Phone'] || row.phone || '+1-800-INSURANCE',
            email: row['Email'] || row.email || 'contact@insurance.com',
            website: row['Website'] || row.website
          }
        };
        break;
        
      case 'policy':
        mappedRow = {
          policyNumber: row['Policy Number'] || row.policyNumber || row.policy_nu,
          policyStartDate: new Date(row['Policy Start Date'] || row.policyStartDate || Date.now()),
          policyEndDate: new Date(row['Policy End Date'] || row.policyEndDate || Date.now() + 365*24*60*60*1000),
          premiumAmount: parseFloat(row['Premium Amount'] || row.premiumAmount || row.premium || 0),
          coverageAmount: parseFloat(row['Coverage Amount'] || row.coverageAmount || 0),
          deductible: parseFloat(row['Deductible'] || row.deductible || 500),
          status: row['Status'] || row.status || (row.hasActiveClientPoli ? 'active' : 'pending'),
          // Foreign keys will be resolved during processing
        };
        break;
        
      default:
        throw new Error(`Unknown sheet type: ${sheetType}`);
    }
    
    mappedData.push(mappedRow);
  }
  
  return mappedData;
};

// Save data to database
const saveToDatabase = async (data, model) => {
  const results = {
    created: 0,
    updated: 0,
    errors: []
  };
  
  for (const item of data) {
    try {
      // Skip empty rows
      if (!item || Object.keys(item).length === 0) continue;
      
      // Try to create new document
      const document = new model(item);
      await document.save();
      results.created++;
    } catch (error) {
      // If duplicate key error, try to update
      if (error.code === 11000) {
        try {
          const updateQuery = {};
          const updateData = { ...item };
          
          // Determine unique field for update query
          if (item.email) updateQuery.email = item.email;
          else if (item.policyNumber) updateQuery.policyNumber = item.policyNumber;
          else if (item.agentName) updateQuery.agentName = item.agentName;
          else if (item.companyName) updateQuery.companyName = item.companyName;
          else if (item.categoryName) updateQuery.categoryName = item.categoryName;
          
          if (Object.keys(updateQuery).length > 0) {
            await model.findOneAndUpdate(updateQuery, updateData, { new: true });
            results.updated++;
          } else {
            results.errors.push(`Unable to determine unique field for update: ${JSON.stringify(item)}`);
          }
        } catch (updateError) {
          results.errors.push(`Update failed: ${updateError.message}`);
        }
      } else {
        results.errors.push(`Create failed: ${error.message}`);
      }
    }
  }
  
  return results;
};

// Main processing function
const processFile = async () => {
  try {
    const { filePath, sheetType } = workerData;
    
    // Connect to database
    await connectDB();
    
    // Determine file type and process
    const ext = path.extname(filePath).toLowerCase();
    let data;
    
    if (ext === '.xlsx' || ext === '.xls') {
      data = await processXLSX(filePath);
    } else if (ext === '.csv') {
      data = await processCSV(filePath);
    } else {
      throw new Error('Unsupported file type. Only XLSX, XLS, and CSV files are supported.');
    }
    
    // Handle consolidated data format differently
    if (sheetType.toLowerCase() === 'consolidated') {
      const consolidatedResults = await mapDataToModel(data, sheetType);
      
      // Calculate totals across all entity types
      const totalCreated = Object.values(consolidatedResults).reduce((sum, entity) => sum + entity.created, 0);
      const totalUpdated = Object.values(consolidatedResults).reduce((sum, entity) => sum + entity.updated, 0);
      const allErrors = Object.values(consolidatedResults).reduce((errors, entity) => [...errors, ...entity.errors], []);
      
      parentPort.postMessage({
        success: true,
        results: {
          totalRows: data.length,
          processed: totalCreated + totalUpdated,
          created: totalCreated,
          updated: totalUpdated,
          errors: allErrors,
          breakdown: consolidatedResults
        }
      });
    } else {
      // Handle individual entity types (original logic)
      const mappedData = await mapDataToModel(data, sheetType);
      
      // Determine model to use
      let model;
      switch (sheetType.toLowerCase()) {
        case 'agent': model = Agent; break;
        case 'user': model = User; break;
        case 'account': model = Account; break;
        case 'lob': model = LOB; break;
        case 'carrier': model = Carrier; break;
        case 'policy': model = Policy; break;
        default: throw new Error(`Unknown sheet type: ${sheetType}`);
      }
      
      // Save to database
      const results = await saveToDatabase(mappedData, model);
      
      // Send results back to main thread
      parentPort.postMessage({
        success: true,
        results: {
          totalRows: data.length,
          processed: results.created + results.updated,
          created: results.created,
          updated: results.updated,
          errors: results.errors
        }
      });
    }
    
  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error.message
    });
  } finally {
    // Close database connection
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Start processing
processFile(); 
import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import type { Artwork } from './types';
import './App.css';

const API_URL = 'https://api.artic.edu/api/v1/artworks';

export default function App() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<number>(1); 
  const [rowsPerPage] = useState<number>(5); 
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const [selectedRows, setSelectedRows] = useState<Artwork[]>([]);

  
  const [panelOpen, setPanelOpen] = useState<boolean>(false);
  const [showRowCheckboxes, setShowRowCheckboxes] = useState<boolean>(true);
  const [selectNumberText, setSelectNumberText] = useState<string>('');
  const [selectingFirstN, setSelectingFirstN] = useState<boolean>(false);

  // Fetch a single page
  const fetchPage = useCallback(async (pageNumber: number) => {
    setLoading(true);
    try {
      const params = {
        page: pageNumber,
        limit: rowsPerPage,
        fields: 'id,title,place_of_origin,artist_display,inscriptions,date_start,date_end'
      };
      const res = await axios.get(API_URL, { params });
      const data: Artwork[] = (res.data.data || []).map((d: any) => ({
        id: d.id,
        title: d.title ?? null,
        place_of_origin: d.place_of_origin ?? null,
        artist_display: d.artist_display ?? null,
        inscriptions: d.inscriptions ?? null,
        date_start: d.date_start ?? null,
        date_end: d.date_end ?? null
      }));
      setArtworks(data);

      const total = res.data.pagination?.total ?? data.length;
      setTotalRecords(total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [rowsPerPage]);

  useEffect(() => {
    fetchPage(1);
    setPage(1);
  }, [fetchPage]);

 
  const onSelectionChange = (e: any) => {
    setSelectedRows(e.value || []);
  };

  
  const onPage = (event: any) => {
    const newPage = event.page + 1;
    setPage(newPage);
    fetchPage(newPage);
  };

 
  const togglePanel = () => setPanelOpen(prev => !prev);

  
  const isAllCurrentPageSelected = () => {
    const selectedIds = new Set(selectedRows.map(r => r.id));
    return artworks.length > 0 && artworks.every(a => selectedIds.has(a.id));
  };

  
  const handleSelectAllOnPageChange = (checked: boolean) => {
    const selectedIds = new Set(selectedRows.map(r => r.id));
    
    if (checked) {
     
      const newSelection = [...selectedRows];
      artworks.forEach(artwork => {
        if (!selectedIds.has(artwork.id)) {
          newSelection.push(artwork);
        }
      });
      setSelectedRows(newSelection);
    } else {
    
      const currentPageIds = new Set(artworks.map(a => a.id));
      const newSelection = selectedRows.filter(row => !currentPageIds.has(row.id));
      setSelectedRows(newSelection);
    }
  };

  
  const selectFirstN = async (n: number) => {
    if (!n || n <= 0) return;
    setSelectingFirstN(true);
    try {
      const perPage = rowsPerPage;
      let pageNo = 1;
      const newSelection: Artwork[] = [];
      
      let totalPages = Infinity;
      while (newSelection.length < n && pageNo <= totalPages) {
        const res = await axios.get(API_URL, {
          params: {
            page: pageNo,
            limit: perPage,
            fields: 'id,title,place_of_origin,artist_display,inscriptions,date_start,date_end'
          }
        });
        const rows: Artwork[] = (res.data.data || []).map((d: any) => ({
          id: d.id,
          title: d.title ?? null,
          place_of_origin: d.place_of_origin ?? null,
          artist_display: d.artist_display ?? null,
          inscriptions: d.inscriptions ?? null,
          date_start: d.date_start ?? null,
          date_end: d.date_end ?? null
        }));

        rows.forEach(row => {
          if (newSelection.length < n) {
            newSelection.push(row);
          }
        });

        const total = res.data.pagination?.total ?? undefined;
        if (typeof total === 'number') {
          totalPages = Math.ceil(total / perPage);
        } else {
          if (rows.length < perPage) break;
        }
        pageNo++;
        if (rows.length === 0) break;
      }

      setSelectedRows(newSelection);
    } catch (err) {
      console.error(err);
    } finally {
      setSelectingFirstN(false);
    }
  };

  
  const applySelectNumber = () => {
    const n = Number(selectNumberText || 0);
    if (!Number.isInteger(n) || n <= 0) {
      return;
    }
    selectFirstN(n);
  };

  
  const handlePanelSubmit = () => {
    console.log('Selected rows:', selectedRows);
  };

  
  const codeHeader = (
    <div className="code-header">
      <button 
        aria-label="Toggle selection panel" 
        className={`chevron-btn ${panelOpen ? 'open' : ''}`} 
        onClick={togglePanel}
      >
        <i className="pi pi-chevron-down"></i>
      </button>
      <span className="code-label">Code</span>
    </div>
  );

  return (
    <div className="app-container">
      <h2>Artworks — server-side pagination + persistent selection + selection panel</h2>

      <div className={`table-wrapper ${panelOpen ? 'panel-open' : 'panel-closed'}`}>
        
        <div className={`selection-panel ${panelOpen ? 'open' : ''}`}>
         

          <div className="panel-row select-number-row">
            <InputText
              placeholder="Select rows..."
              value={selectNumberText}
              onChange={e => setSelectNumberText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') applySelectNumber();
              }}
              className="select-input"
            />
            <Button 
              label={selectingFirstN ? 'Selecting...' : 'Submit'} 
              onClick={applySelectNumber} 
              loading={selectingFirstN}
              className="apply-btn"
            />
          </div>

          
        </div>

        
        <div className={`datatable-container ${showRowCheckboxes ? '' : 'hide-checkboxes'}`}>
          <DataTable
            value={artworks}
            paginator
            rows={rowsPerPage}
            first={(page - 1) * rowsPerPage}
            totalRecords={totalRecords}
            lazy
            onPage={onPage}
            loading={loading}
            dataKey="id"
            selection={selectedRows}
            onSelectionChange={onSelectionChange as any}
            selectionMode="multiple"
            responsiveLayout="scroll"
            emptyMessage="No records"
          >
            <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>
            <Column header={codeHeader} field="id" headerClassName="code-col-header" style={{ minWidth: '8rem' }} />
            <Column field="title" header="Name" style={{ minWidth: '18rem' }} />
            <Column field="place_of_origin" header="Category" style={{ minWidth: '12rem' }} />
            <Column field="artist_display" header="Artist Display" style={{ minWidth: '18rem' }} />
            <Column field="inscriptions" header="Inscriptions" style={{ minWidth: '15rem' }} />
            <Column field="date_start" header="Date start" style={{ width: '8rem' }} />
            <Column field="date_end" header="Date end" style={{ width: '8rem' }} />
          </DataTable>
        </div>
      </div>

      <div className="footer">
        <strong>Selected:</strong> {selectedRows.length} rows
      </div>
    </div>
  );
}
      

      

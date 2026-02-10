export interface EditorComponent {
  id?: string;
  type: string;
  label: string;
  icon?: string;
  props: Record<string, any>;
  style?: Record<string, any>;
  children?: EditorComponent[];
  isContainer?: boolean;
  model?: string; // v-model key
  text?: string; // inner text for buttons etc
  options?: any[]; // for select/radio
}

export const componentList: { title: string; items: EditorComponent[] }[] = [
  {
    title: 'visualEditor.componentGroups.layout',
    items: [
      {
        type: 'el-row',
        label: 'visualEditor.components.row',
        icon: 'Menu',
        props: { gutter: 20, justify: 'start', align: 'top' },
        children: [],
        isContainer: true
      },
      {
        type: 'el-col',
        label: 'visualEditor.components.col',
        icon: 'Menu',
        props: { span: 12 },
        children: [],
        isContainer: true
      },
      {
        type: 'el-card',
        label: 'visualEditor.components.card',
        icon: 'Document',
        props: { header: 'Card Title', shadow: 'always' },
        children: [],
        isContainer: true
      },
      {
        type: 'el-form',
        label: 'visualEditor.components.form',
        icon: 'Tickets',
        props: {
          labelWidth: '100px',
          labelPosition: 'right',
          size: 'default',
          submitUrl: '',
          submitMethod: 'post'
        },
        children: [],
        isContainer: true
      }
    ]
  },
  {
    title: 'visualEditor.componentGroups.basic',
    items: [
      {
        type: 'el-input',
        label: 'visualEditor.components.input',
        icon: 'Edit',
        props: { placeholder: 'Please input', clearable: true, label: 'Input Label' },
        model: 'field_input'
      },
      {
        type: 'el-input-number',
        label: 'visualEditor.components.inputNumber',
        icon: 'Edit',
        props: { placeholder: 'Please input', min: 0, label: 'Number Label' },
        model: 'field_number'
      },
      {
        type: 'el-select',
        label: 'visualEditor.components.select',
        icon: 'Select',
        props: { placeholder: 'Please select', clearable: true, label: 'Select Label' },
        model: 'field_select',
        options: [
          { label: 'Option 1', value: '1' },
          { label: 'Option 2', value: '2' }
        ]
      },
      {
        type: 'el-switch',
        label: 'visualEditor.components.switch',
        icon: 'Switch',
        props: { label: 'Switch Label' },
        model: 'field_switch'
      },
      {
        type: 'el-date-picker',
        label: 'visualEditor.components.datePicker',
        icon: 'Calendar',
        props: { type: 'date', placeholder: 'Select date', label: 'Date Label' },
        model: 'field_date'
      },
      {
        type: 'el-button',
        label: 'visualEditor.components.button',
        icon: 'Pointer',
        props: { type: 'primary', plain: false },
        text: 'Button'
      },
      {
        type: 'h1',
        label: 'visualEditor.components.h1',
        icon: 'Postcard',
        props: {},
        text: 'Heading 1'
      },
      {
        type: 'p',
        label: 'visualEditor.components.p',
        icon: 'ChatLineSquare',
        props: {},
        text: 'Paragraph text'
      }
    ]
  },
  {
    title: 'visualEditor.componentGroups.advanced',
    items: [
      {
        type: 'ProTable',
        label: 'visualEditor.components.proTable',
        icon: 'Grid',
        props: {
          columns: [],
          pagination: true,
          title: '',
          toolButton: true,
          stripe: false,
          size: 'default',
          apiUrl: '', // Configurable API URL
          // Placeholder requestApi to avoid typing issues in editor if needed,
          // though the runtime check in ProTable handles it now.
          requestApi: undefined
        },
        model: ''
      }
    ]
  }
];
